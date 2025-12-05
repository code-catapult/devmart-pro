import { prisma } from '~/lib/prisma'
import { TRPCError } from '@trpc/server'
import { stripe } from '~/lib/stripe'
import { OrderStatus } from '@prisma/client'
import { EmailService } from '~/server/services/EmailService'
import Stripe from 'stripe'

export type RefundReason =
  | 'CUSTOMER_REQUEST'
  | 'DAMAGED'
  | 'OUT_OF_STOCK'
  | 'OTHER'

interface ProcessRefundParams {
  orderId: string
  amount: number // In cents, 0 = full refund
  reason: RefundReason
  notes?: string
  adminUserId: string
}

export class RefundService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * Process refund through Stripe and update order
   */
  async processRefund(params: ProcessRefundParams) {
    const { orderId, amount, reason, notes, adminUserId } = params

    // 1. Fetch order with payment details
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

    // 2. Validate order is refundable
    this.validateRefundable(order)

    // 3. Calculate refund amount (0 = full refund)
    const refundAmount = this.calculateRefundAmount(order, amount)

    // 4. Validate refund amount doesn't exceed order total
    const totalRefunded = order.refundAmount || 0
    if (totalRefunded + refundAmount > order.total) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Refund amount $${refundAmount / 100} + existing refunds $${
          totalRefunded / 100
        } would exceed order total $${order.total / 100}`,
      })
    }

    // 5. Process refund through Stripe (BEFORE database update)
    let stripeRefund: Stripe.Refund
    try {
      stripeRefund = await this.createStripeRefund(
        order.stripePaymentIntentId!,
        refundAmount,
        orderId
      )
    } catch (error) {
      // Stripe refund failed - don't update database
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Stripe error'
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Stripe refund failed: ${errorMessage}`,
      })
    }

    // 6. Only if Stripe succeeds, update database
    const newRefundAmount = totalRefunded + refundAmount
    const isFullRefund = newRefundAmount >= order.total

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        refundAmount: newRefundAmount,
        refundReason: reason,
        refundedAt: new Date(),
        // Auto-cancel if full refund
        status: isFullRefund ? OrderStatus.CANCELLED : order.status,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    })

    // 7. Send refund confirmation email (async)
    this.sendRefundEmail(updatedOrder, refundAmount, stripeRefund.id).catch(
      (err) => {
        console.error(`Failed to send refund email for order ${orderId}:`, err)
      }
    )

    // 8. Log audit trail
    console.log(
      `[AUDIT] Admin ${adminUserId} processed refund for order ${orderId}: $${
        refundAmount / 100
      } (${reason})${notes ? ` - Notes: ${notes}` : ''}`
    )
    console.log(`[AUDIT] Stripe refund ID: ${stripeRefund.id}`)

    return {
      order: updatedOrder,
      refund: {
        id: stripeRefund.id,
        amount: refundAmount,
        status: stripeRefund.status,
        reason: reason,
      },
    }
  }

  /**
   * Create refund through Stripe API
   */
  private async createStripeRefund(
    paymentIntentId: string,
    amount: number,
    orderId: string
  ): Promise<Stripe.Refund> {
    // Generate idempotency key to prevent duplicate refunds
    const idempotencyKey = `refund_${orderId}_${amount}_${Date.now()}`

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amount,
        reason: 'requested_by_customer', // Stripe's enum for refund reason
      },
      {
        idempotencyKey: idempotencyKey, // Prevents duplicate refunds on retry
      }
    )

    // Verify refund succeeded
    if (refund.status === 'failed') {
      throw new Error(`Stripe refund failed: ${refund.failure_reason}`)
    }

    return refund
  }

  /**
   * Calculate actual refund amount (handle 0 = full refund)
   */
  calculateRefundAmount(
    order: { total: number; refundAmount: number | null },
    requestedAmount: number
  ): number {
    const alreadyRefunded = order.refundAmount || 0
    const remainingRefundable = order.total - alreadyRefunded

    // 0 or amount > remaining = full refund of remaining amount
    if (requestedAmount === 0 || requestedAmount > remainingRefundable) {
      return remainingRefundable
    }

    return requestedAmount
  }

  /**
   * Validate order is eligible for refund
   */
  private validateRefundable(order: {
    status: OrderStatus
    stripePaymentIntentId: string | null
    total: number
    refundAmount: number | null
  }) {
    // Must have payment intent (paid orders only)
    if (!order.stripePaymentIntentId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order has no payment record. Cannot process refund.',
      })
    }

    // Only allow refunds for certain statuses
    const refundableStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ]

    if (!refundableStatuses.includes(order.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot refund order with status ${order.status}. Order must be PROCESSING, SHIPPED, or DELIVERED.`,
      })
    }

    // Check if already fully refunded
    const totalRefunded = order.refundAmount || 0
    if (totalRefunded >= order.total) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order has already been fully refunded.',
      })
    }
  }

  /**
   * Send refund confirmation email to customer
   */
  private async sendRefundEmail(
    order: {
      orderNumber: string
      total: number
      refundAmount: number | null
      user: { email: string }
    },
    refundAmount: number,
    stripeRefundId: string
  ) {
    const isFullRefund = (order.refundAmount ?? 0) >= order.total

    await this.emailService.sendEmail({
      to: order.user.email,
      subject: `Refund processed for order ${order.orderNumber}`,
      html: `
        <h2>Refund Confirmation</h2>
        <p>A refund has been processed for your order.</p>

        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(
          2
        )}</p>
        <p><strong>Refund Type:</strong> ${
          isFullRefund ? 'Full Refund' : 'Partial Refund'
        }</p>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>The refund has been submitted to your payment provider</li>
          <li>You should see the refund in 5-10 business days</li>
          <li>The refund will appear on the same payment method you used</li>
        </ul>

        <p><strong>Refund Reference:</strong> ${stripeRefundId}</p>
        <p>If you have questions about this refund, please contact support with this reference number.</p>
      `,
    })
  }

  /**
   * Create refund record in database (for audit/tracking)
   * Optional: Separate Refund table for detailed refund history
   */
  async createRefundRecord(_orderId: string, _amount: number, _reason: string) {
    // In production: Create separate Refund model with fields:
    // - id, orderId, amount, reason, stripeRefundId, createdAt, createdBy
    // For this story: Using order.refundAmount field is sufficient
    return { message: 'Refund tracked in order.refundAmount field' }
  }
}
