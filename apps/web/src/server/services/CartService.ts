import { cartRepository } from '../repositories/CartRepository'
import { TRPCError } from '@trpc/server'
import { prisma } from '~/lib/prisma'

export class CartService {
  /**
   * Add item to cart with inventory validation
   */
  async addItem(userId: string, productId: string, quantity: number) {
    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || product.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found or unavailable',
      })
    }

    // Check inventory
    if (product.inventory < quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Only ${product.inventory} items available`,
      })
    }

    // Get current cart quantity for this product
    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    })

    const totalQuantity = (existingItem?.quantity || 0) + quantity

    // Validate total quantity doesn't exceed inventory
    if (totalQuantity > product.inventory) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot add ${quantity} more. Only ${product.inventory - (existingItem?.quantity || 0)} available`,
      })
    }

    return cartRepository.upsertItem(userId, productId, quantity)
  }

  /**
   * Calculate cart totals
   */
  async calculateTotals(userId: string) {
    const cartItems = await cartRepository.findByUserId(userId)

    const subtotal = cartItems.reduce((sum, item) => {
      return sum + item.product.price * item.quantity
    }, 0)

    // Simple tax calculation (8%)
    const tax = Math.round(subtotal * 0.08)

    // Flat rate shipping (free over $100)
    const shipping = subtotal >= 10000 ? 0 : 999 // $100, $9.99 in cents

    const total = subtotal + tax + shipping

    return {
      subtotal,
      tax,
      shipping,
      total,
      items: cartItems,
    }
  }
}

export const cartService = new CartService()
