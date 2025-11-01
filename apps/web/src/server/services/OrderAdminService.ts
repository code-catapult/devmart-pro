import { prisma } from '~/lib/prisma'
import { TRPCError } from '@trpc/server'
import { OrderStatus, type Prisma } from '@prisma/client'
import { EmailService } from '~/server/services/EmailService' // From Story 2.4

// Valid status transitions (state machine)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
}

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

    // 3. Update order in database
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
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

    // 5. Log audit trail (in production, save to separate audit table)
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
  validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): { valid: boolean; warning?: string } {
    const validNextStates = VALID_TRANSITIONS[currentStatus] || []

    if (!validNextStates.includes(newStatus)) {
      return { valid: false }
    }

    // Special warning for risky transitions
    if (
      currentStatus === OrderStatus.SHIPPED &&
      newStatus === OrderStatus.CANCELLED
    ) {
      return {
        valid: true,
        warning:
          'Package may already be in transit. Customer may still receive the order.',
      }
    }

    return { valid: true }
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
   * Get customer's order history with summary statistics
   */
  async getCustomerOrderHistory(userId: string, page: number, limit: number) {
    const where = { userId }

    // Parallel queries for stats and orders
    const [totalOrders, orders, orderStats] = await Promise.all([
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
        total: totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
      },
      stats: {
        totalOrders,
        totalSpent: orderStats._sum.total || 0,
        averageOrderValue: orderStats._avg.total || 0,
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
      orderIds.map((orderId) =>
        prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
          include: {
            user: true,
            orderItems: { include: { product: true } },
          },
        })
      )
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
  private async sendStatusChangeEmail(
    order: Prisma.OrderGetPayload<{
      include: { user: true; orderItems: { include: { product: true } } }
    }>,
    previousStatus: OrderStatus,
    newStatus: OrderStatus
  ) {
    const templates: Partial<
      Record<OrderStatus, { subject: string; message: string }>
    > = {
      PROCESSING: {
        subject: `Your order ${order.orderNumber} is being prepared`,
        message: `We're preparing your order for shipment. You'll receive a tracking number once it ships.`,
      },
      SHIPPED: {
        subject: `Your order ${order.orderNumber} has been shipped`,
        message: `Your package is on its way! ${
          order.trackingNumber
            ? `Track it with ${order.shippingCarrier}: ${order.trackingNumber}`
            : "You'll receive tracking information soon."
        }`,
      },
      DELIVERED: {
        subject: `Your order ${order.orderNumber} has been delivered`,
        message: `Your package has been delivered. Thank you for your order!`,
      },
      CANCELLED: {
        subject: `Your order ${order.orderNumber} has been cancelled`,
        message: `Your order has been cancelled. ${
          previousStatus === OrderStatus.PROCESSING ||
          previousStatus === OrderStatus.SHIPPED
            ? 'A refund will be processed if payment was made.'
            : ''
        }`,
      },
    }

    const template = templates[newStatus]
    if (!template) return // No email for PENDING status

    await this.emailService.sendEmail({
      to: order.user.email,
      subject: template.subject,
      html: `
        <h2>${template.subject}</h2>
        <p>${template.message}</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Order Total:</strong> $${(order.total / 100).toFixed(2)}</p>
      `,
    })
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
}
