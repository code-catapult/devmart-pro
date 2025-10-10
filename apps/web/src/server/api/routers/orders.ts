import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { orderRepository } from '~/server/repositories/OrderRepository'
import { orderService } from '~/server/services/OrderService'
import { paymentService } from '~/server/services/PaymentService'
import { cartService } from '~/server/services/CartService'

const ShippingAddressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
})

export const ordersRouter = createTRPCRouter({
  /**
   * Create payment intent for checkout
   */
  createPaymentIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const cart = await cartService.calculateTotals(ctx.session.user.id)

    if (cart.items.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cart is empty',
      })
    }

    return await paymentService.createPaymentIntent(
      cart.total,
      ctx.session.user.id
    )
  }),

  /**
   * Create order after successful payment
   */
  create: protectedProcedure
    .input(
      z.object({
        shippingAddress: ShippingAddressSchema,
        paymentIntentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify payment succeeded
      const paymentResult = await paymentService.confirmPayment(
        input.paymentIntentId
      )

      if (!paymentResult.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment not confirmed',
        })
      }

      return await orderService.createOrderFromCart(
        ctx.session.user.id,
        input.shippingAddress,
        input.paymentIntentId
      )
    }),

  /**
   * Get order by ID
   */
  getById: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await orderRepository.findById(input.orderId)

      if (!order || order.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        })
      }

      return order
    }),

  /**
   * Get user's order history
   */
  getUserOrders: protectedProcedure.query(async ({ ctx }) => {
    return await orderRepository.findByUserId(ctx.session.user.id)
  }),
})
