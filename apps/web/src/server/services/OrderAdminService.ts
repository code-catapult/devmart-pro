import { prisma } from '~/lib/prisma'
import { TRPCError } from '@trpc/server'
import { OrderStatus, type Prisma } from '@prisma/client'
import { EmailService } from '~/server/services/EmailService' // From Story 2.4
import { invalidateCacheKey, invalidateCache } from '~/lib/cache'
import { formatCurrency } from '@repo/shared/utils'

import {
  isValidTransition,
  getTransitionWarning,
} from '~/lib/order-status-machine'

// Valid status transitions (state machine)
// const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
//   PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
//   PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
//   SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
//   DELIVERED: [], // Terminal state
//   CANCELLED: [], // Terminal state
// }

// Type definitions for service methods
interface ListOrdersParams {
  search?: string
  status?: OrderStatus
  startDate?: Date
  endDate?: Date
  sortBy: 'orderNumber' | 'createdAt' | 'total'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

interface PaginatedOrders {
  orders: Array<
    Prisma.OrderGetPayload<{
      include: {
        user: { select: { name: true; email: true } }
        orderItems: { include: { product: true } }
      }
    }>
  >
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface ShippingTrackingParams {
  orderId: string
  trackingNumber: string
  shippingCarrier: string
  estimatedDelivery?: Date
  adminUserId: string
}

type EventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'STATUS_CHANGED'
  | 'TRACKING_ADDED'
  | 'REFUND_PROCESSED'
  | 'NOTE_ADDED'

interface TimelineEvent {
  id: string
  type: EventType
  timestamp: Date
  title: string
  description?: string
  user?: {
    name: string | null
    email: string
  }
  metadata?: Record<string, unknown>
}

export class OrderAdminService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * List orders with advanced filtering, sorting, and pagination
   */
  async listOrders(params: ListOrdersParams): Promise<PaginatedOrders> {
    const {
      search,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      limit,
    } = params

    // Build where clause dynamically based on filters
    const where: Prisma.OrderWhereInput = {
      // Search by order number or customer name/email
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
      // Filter by status (if not "ALL")
      ...(status && { status }),
      // Filter by date range
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    }

    // Execute count and data query in parallel for performance
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }, // Only select needed fields
          },
          orderItems: {
            include: {
              product: true, // Need product details for display
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit, // Offset-based pagination
        take: limit,
      }),
    ])

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get single order with full details
   */
  async getOrderDetails(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true, // Full user details for admin view
        orderItems: {
          include: {
            product: true, // Product details for each item
          },
        },
      },
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Order with ID ${orderId} not found`,
      })
    }

    return order
  }

  /**
   * Update order status with validation, audit logging, and email notification
   */
  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminUserId: string,
    notes?: string
  ) {
    // 1. Fetch current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }, // Need user for email notification
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Order with ID ${orderId} not found`,
      })
    }

    // 2. Validate status transition
    const validation = this.validateStatusTransition(order.status, newStatus)
    if (!validation.valid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid status transition: ${order.status} → ${newStatus}`,
      })
    }

    // 3. Update order in database and create status change record
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: newStatus,
            changedBy: adminUserId,
            notes: notes,
          },
        },
      },
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    })

    // 4. Send email notification (async, don't block on failure)
    this.sendStatusChangeEmail(updatedOrder, order.status, newStatus).catch(
      (err) => {
        console.error(
          `Failed to send status change email for order ${orderId}:`,
          err
        )
      }
    )

    // 5. Invalidate affected caches
    // Run invalidations in parallel, but don't fail mutation if invalidation fails
    await Promise.all([
      invalidateCacheKey('admin:metrics'), // Dashboard KPIs affected
      invalidateCache('admin:analytics:*'), // Sales analytics affected (if DELIVERED)
    ]).catch((err) => {
      // Log but don't throw - cache invalidation failure is non-fatal
      console.error('⚠️  Cache invalidation failed after order update:', err)
    })

    // 6. Log audit trail (in production, save to separate audit table)
    console.log(
      `[AUDIT] Admin ${adminUserId} changed order ${orderId} status: ${
        order.status
      } → ${newStatus}${notes ? ` (Notes: ${notes})` : ''}`
    )

    return {
      order: updatedOrder,
      warning: validation.warning, // Return warning if exists (e.g., cancelling shipped order)
    }
  }

  /**
   * Validate status transition using state machine
   */
  // validateStatusTransition(
  //   currentStatus: OrderStatus,
  //   newStatus: OrderStatus
  // ): { valid: boolean; warning?: string } {
  //   const validNextStates = VALID_TRANSITIONS[currentStatus] || []

  //   if (!validNextStates.includes(newStatus)) {
  //     return { valid: false }
  //   }

  //   // Special warning for risky transitions
  //   if (
  //     currentStatus === OrderStatus.SHIPPED &&
  //     newStatus === OrderStatus.CANCELLED
  //   ) {
  //     return {
  //       valid: true,
  //       warning:
  //         'Package may already be in transit. Customer may still receive the order.',
  //     }
  //   }

  //   return { valid: true }
  // }

  validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): { valid: boolean; warning?: string } {
    // Now uses shared module instead of local copy
    const valid = isValidTransition(currentStatus, newStatus)

    if (!valid) {
      return { valid: false }
    }

    // Check for warnings on risky transitions
    const warning = getTransitionWarning(currentStatus, newStatus)

    return warning ? { valid: true, warning } : { valid: true }
  }

  /**
   * Add shipping tracking and automatically update status to SHIPPED
   */
  async addShippingTracking(params: ShippingTrackingParams) {
    const {
      orderId,
      trackingNumber,
      shippingCarrier,
      estimatedDelivery,
      adminUserId,
    } = params

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Order with ID ${orderId} not found`,
      })
    }

    // Validate current status allows adding tracking
    if (order.status !== OrderStatus.PROCESSING) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot add tracking to order with status ${order.status}. Order must be PROCESSING.`,
      })
    }

    // Update order with tracking info and status SHIPPED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        shippingCarrier,
        estimatedDelivery,
        status: OrderStatus.SHIPPED,
        updatedAt: new Date(),
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: OrderStatus.SHIPPED,
            changedBy: adminUserId,
            notes: `Tracking added: ${shippingCarrier} ${trackingNumber}`,
          },
        },
      },
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    })

    // Send shipment notification email with tracking info
    this.sendShipmentEmail(updatedOrder).catch((err) => {
      console.error(`Failed to send shipment email for order ${orderId}:`, err)
    })

    // Audit log
    console.log(
      `[AUDIT] Admin ${adminUserId} added tracking to order ${orderId}: ${shippingCarrier} ${trackingNumber}`
    )

    return updatedOrder
  }

  /**
   * Update existing shipping tracking information
   * Allows updates for orders in PROCESSING or SHIPPED status
   */
  async updateShippingTracking(params: ShippingTrackingParams) {
    const {
      orderId,
      trackingNumber,
      shippingCarrier,
      estimatedDelivery,
      adminUserId,
    } = params

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Order with ID ${orderId} not found`,
      })
    }

    // Verify order has existing tracking
    if (!order.trackingNumber) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Order ${orderId} does not have tracking information to update. Use addTrackingInfo instead.`,
      })
    }

    // Validate current status allows updating tracking (PROCESSING or SHIPPED)
    if (!['PROCESSING', 'SHIPPED'].includes(order.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot update tracking for order with status ${order.status}. Order must be PROCESSING or SHIPPED.`,
      })
    }

    // Update order with new tracking info (don't change status)
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        shippingCarrier,
        estimatedDelivery,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    })

    // Note: No email sent for updates, only for initial tracking
    // Could optionally send an "updated tracking" email here

    // Audit log
    console.log(
      `[AUDIT] Admin ${adminUserId} updated tracking for order ${orderId}: ${shippingCarrier} ${trackingNumber}`
    )

    return updatedOrder
  }

  /**
   * Get customer's order history with summary statistics
   */
  async getCustomerOrderHistory(
    userId: string,
    page: number,
    limit: number,
    status?: OrderStatus
  ) {
    const where = { userId, ...(status && { status }) }

    // Parallel queries for stats and orders
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          orderItems: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.aggregate({
        where,
        _sum: { total: true },
        _avg: { total: true },
      }),
    ])

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Bulk update order status with transaction
   */
  async bulkUpdateStatus(
    orderIds: string[],
    newStatus: OrderStatus,
    adminUserId: string
  ) {
    // Fetch all orders to validate transitions
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { user: true },
    })

    if (orders.length !== orderIds.length) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Some orders not found',
      })
    }

    // Validate all transitions before updating any
    const invalidTransitions: string[] = []
    orders.forEach((order) => {
      const validation = this.validateStatusTransition(order.status, newStatus)
      if (!validation.valid) {
        invalidTransitions.push(
          `Order ${order.orderNumber}: ${order.status} → ${newStatus}`
        )
      }
    })

    if (invalidTransitions.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid transitions:\n${invalidTransitions.join('\n')}`,
      })
    }

    // Update all orders in a transaction (all-or-nothing)
    const updatedOrders = await prisma.$transaction(
      orderIds.map((orderId) => {
        const order = orders.find((o) => o.id === orderId)!
        return prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                previousStatus: order.status,
                newStatus: newStatus,
                changedBy: adminUserId,
                notes: 'Bulk status update',
              },
            },
          },
          include: {
            user: true,
            orderItems: { include: { product: true } },
          },
        })
      })
    )

    // Send email notifications for all orders (async)
    updatedOrders.forEach((updatedOrder) => {
      const originalOrder = orders.find((o) => o.id === updatedOrder.id)
      if (originalOrder) {
        this.sendStatusChangeEmail(
          updatedOrder,
          originalOrder.status,
          newStatus
        ).catch((err) => {
          console.error(
            `Failed to send email for bulk update order ${updatedOrder.id}:`,
            err
          )
        })
      }
    })

    // Invalidate affected caches
    // Run invalidations in parallel, but don't fail mutation if invalidation fails
    await Promise.all([
      invalidateCacheKey('admin:metrics'), // Dashboard KPIs affected
      invalidateCache('admin:analytics:*'), // Sales analytics affected (if DELIVERED)
    ]).catch((err) => {
      // Log but don't throw - cache invalidation failure is non-fatal
      console.error(
        '⚠️  Cache invalidation failed after bulk order update:',
        err
      )
    })

    // Audit log
    console.log(
      `[AUDIT] Admin ${adminUserId} bulk updated ${orderIds.length} orders to ${newStatus}`
    )

    return {
      updatedCount: updatedOrders.length,
      orders: updatedOrders,
    }
  }

  /**
   * Send status change email notification
   */
  // private async sendStatusChangeEmail(
  //   order: Prisma.OrderGetPayload<{
  //     include: { user: true; orderItems: { include: { product: true } } }
  //   }>,
  //   previousStatus: OrderStatus,
  //   newStatus: OrderStatus
  // ) {
  //   const templates: Partial<
  //     Record<OrderStatus, { subject: string; message: string }>
  //   > = {
  //     PROCESSING: {
  //       subject: `Your order ${order.orderNumber} is being prepared`,
  //       message: `We're preparing your order for shipment. You'll receive a tracking number once it ships.`,
  //     },
  //     SHIPPED: {
  //       subject: `Your order ${order.orderNumber} has been shipped`,
  //       message: `Your package is on its way! ${
  //         order.trackingNumber
  //           ? `Track it with ${order.shippingCarrier}: ${order.trackingNumber}`
  //           : "You'll receive tracking information soon."
  //       }`,
  //     },
  //     DELIVERED: {
  //       subject: `Your order ${order.orderNumber} has been delivered`,
  //       message: `Your package has been delivered. Thank you for your order!`,
  //     },
  //     CANCELLED: {
  //       subject: `Your order ${order.orderNumber} has been cancelled`,
  //       message: `Your order has been cancelled. ${
  //         previousStatus === OrderStatus.PROCESSING ||
  //         previousStatus === OrderStatus.SHIPPED
  //           ? 'A refund will be processed if payment was made.'
  //           : ''
  //       }`,
  //     },
  //   }

  //   const template = templates[newStatus]
  //   if (!template) return // No email for PENDING status

  //   await this.emailService.sendEmail({
  //     to: order.user.email,
  //     subject: template.subject,
  //     html: `
  //       <h2>${template.subject}</h2>
  //       <p>${template.message}</p>
  //       <p><strong>Order Number:</strong> ${order.orderNumber}</p>
  //       <p><strong>Order Total:</strong> $${(order.total / 100).toFixed(2)}</p>
  //     `,
  //   })
  // }

  private async sendStatusChangeEmail(
    order: Prisma.OrderGetPayload<{
      include: {
        user: true
        orderItems: { include: { product: true } }
      }
    }>,
    previousStatus: OrderStatus,
    newStatus: OrderStatus
  ): Promise<void> {
    // Delegate to EmailService - it has the rich HTML templates
    await this.emailService.sendOrderStatusChangeEmail(
      order,
      previousStatus,
      newStatus
    )
  }

  /**
   * Send shipment notification with tracking info
   */
  private async sendShipmentEmail(
    order: Prisma.OrderGetPayload<{
      include: { user: true; orderItems: { include: { product: true } } }
    }>
  ) {
    await this.emailService.sendEmail({
      to: order.user.email,
      subject: `Your order ${order.orderNumber} has been shipped`,
      html: `
        <h2>Your Order Has Shipped!</h2>
        <p>Your package is on its way.</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Tracking Number:</strong> ${
          order.trackingNumber || 'Not available'
        }</p>
        <p><strong>Carrier:</strong> ${
          order.shippingCarrier || 'Not specified'
        }</p>
        ${
          order.estimatedDelivery
            ? `<p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery.toLocaleDateString()}</p>`
            : ''
        }
      `,
    })
  }

  /**
   * Get all notes for an order
   */
  async getOrderNotes(orderId: string) {
    const notes = await prisma.orderNote.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }, // Chronological order
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return notes
  }

  /**
   * Add a note to an order
   */
  async addOrderNote(
    orderId: string,
    adminId: string,
    content: string,
    isInternal: boolean = true
  ) {
    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      })
    }

    // Create note with current admin user
    const note = await prisma.orderNote.create({
      data: {
        orderId,
        adminId,
        content,
        isInternal,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Optional: If customer-visible, send email notification
    if (!isInternal) {
      // TODO: await emailService.sendOrderUpdateToCustomer(order, note);
    }

    return note
  }

  /**
   * Get order timeline with all events (status changes, notes, tracking, refunds)
   */
  async getOrderTimeline(orderId: string): Promise<TimelineEvent[]> {
    // Fetch order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedByUser: {
              select: { name: true, email: true },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: {
            admin: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      })
    }

    // Build timeline events from multiple sources
    const events: TimelineEvent[] = []

    // 1. Order created event
    events.push({
      id: `order-created-${order.id}`,
      type: 'ORDER_CREATED',
      timestamp: order.createdAt,
      title: 'Order Created',
      description: `Order #${order.orderNumber} placed`,
    })

    // 2. Payment confirmed event (if paid)
    if (order.stripePaymentIntentId) {
      events.push({
        id: `payment-confirmed-${order.id}`,
        type: 'PAYMENT_CONFIRMED',
        timestamp: order.createdAt,
        title: 'Payment Confirmed',
        description: `Payment of ${formatCurrency(order.total)} received`,
        metadata: {
          amount: formatCurrency(order.total),
          method: 'Credit Card',
        },
      })
    }

    // 3. Status change events
    for (const change of order.statusHistory) {
      const previousStatusText = change.previousStatus
        ? this.formatStatus(change.previousStatus)
        : 'None'
      const newStatusText = this.formatStatus(change.newStatus)

      events.push({
        id: change.id,
        type: 'STATUS_CHANGED',
        timestamp: change.createdAt,
        title: `Status Updated`,
        description: `${previousStatusText} → ${newStatusText}`,
        user: change.changedByUser || undefined,
        metadata: {
          ...(change.notes ? { notes: change.notes } : {}),
          newStatus: change.newStatus,
        },
      })
    }

    // 4. Tracking added event (if tracking exists)
    if (order.trackingNumber && order.shippingCarrier) {
      const trackingAddedAt =
        order.statusHistory.find((h) => h.newStatus === 'SHIPPED')?.createdAt ||
        order.updatedAt

      events.push({
        id: `tracking-added-${order.id}`,
        type: 'TRACKING_ADDED',
        timestamp: trackingAddedAt,
        title: 'Tracking Information Added',
        description: `Shipment is on its way`,
        metadata: {
          carrier: order.shippingCarrier,
          tracking: order.trackingNumber,
        },
      })
    }

    // 5. Refund events (if refunded)
    if (order.refundAmount && order.refundAmount > 0) {
      events.push({
        id: `refund-processed-${order.id}`,
        type: 'REFUND_PROCESSED',
        timestamp: order.refundedAt || order.updatedAt,
        title: 'Refund Processed',
        description: `Refund of ${formatCurrency(order.refundAmount)} issued`,
        metadata: {
          amount: formatCurrency(order.refundAmount),
          reason: order.refundReason || 'Not specified',
        },
      })
    }

    // 6. Note events
    for (const note of order.notes) {
      events.push({
        id: note.id,
        type: 'NOTE_ADDED',
        timestamp: note.createdAt,
        title: note.isInternal ? 'Internal Note Added' : 'Note Added',
        description:
          note.content.substring(0, 100) +
          (note.content.length > 100 ? '...' : ''),
        user: note.admin,
      })
    }

    // Sort all events chronologically
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  /**
   * Format order status for display
   */
  private formatStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    }
    return statusMap[status] || status
  }
}
