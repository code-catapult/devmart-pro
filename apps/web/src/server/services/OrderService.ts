import { orderRepository } from '../repositories/OrderRepository'
import { cartService } from './CartService'
import { emailService } from './EmailService'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@repo/shared/types'
import { prisma } from '~/lib/prisma'

export class OrderService {
  /**
   * Create order from cart
   */
  async createOrderFromCart(
    userId: string,
    shippingAddress: Prisma.InputJsonValue,
    paymentIntentId: string
  ) {
    // Get cart totals
    const cart = await cartService.calculateTotals(userId)

    if (cart.items.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cart is empty',
      })
    }

    // Validate inventory one more time
    for (const item of cart.items) {
      if (item.product.inventory < item.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient inventory for ${item.product.name}`,
        })
      }
    }

    // Generate order number
    const orderNumber = orderRepository.generateOrderNumber()

    // Create order
    const order = await orderRepository.createOrder({
      userId,
      orderNumber,
      shippingAddress,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      stripePaymentIntentId: paymentIntentId,
      items: cart.items.map(
        (item: {
          product: { id: string; price: number }
          quantity: number
        }) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })
      ),
    })

    if (!order) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create order',
      })
    }

    // Send confirmation email
    try {
      // Get user email and name - we need to fetch it since order doesn't include user relation
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      })

      if (user?.email) {
        await emailService.sendOrderConfirmation(
          order,
          user.email,
          user.name ?? undefined
        )
      }
    } catch (error) {
      // Log error but don't fail order creation
      console.error('Failed to send order confirmation email:', error)
    }

    return order
  }
}

export const orderService = new OrderService()
