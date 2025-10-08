import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { cartRepository } from '~/server/repositories/CartRepository'
import { cartService } from '~/server/services/CartService'
import { TRPCError } from '@trpc/server'
import { prisma } from '~/lib/prisma'

export const cartRouter = createTRPCRouter({
  /**
   * Get user's cart with totals
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    return await cartService.calculateTotals(ctx.session.user.id)
  }),

  /**
   * Add item to cart
   */
  addItem: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1).max(99),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await cartService.addItem(
        ctx.session.user.id,
        input.productId,
        input.quantity
      )
    }),

  /**
   * Update item quantity
   */
  updateItem: protectedProcedure
    .input(
      z.object({
        cartItemId: z.string(),
        quantity: z.number().min(1).max(99),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before updating
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: input.cartItemId },
      })

      if (!cartItem || cartItem.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update items in your own cart',
        })
      }

      return await cartRepository.updateQuantity(
        input.cartItemId,
        input.quantity
      )
    }),

  /**
   * Remove item from cart
   */
  removeItem: protectedProcedure
    .input(
      z.object({
        cartItemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before removing
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: input.cartItemId },
      })

      if (!cartItem || cartItem.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only remove items from your own cart',
        })
      }

      return await cartRepository.removeItem(input.cartItemId)
    }),

  /**
   * Clear entire cart
   */
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    return await cartRepository.clearCart(ctx.session.user.id)
  }),
})
