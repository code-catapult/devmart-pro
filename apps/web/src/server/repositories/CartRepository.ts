import { prisma } from '~/lib/prisma'

export class CartRepository {
  /**
   * Get user's cart with product details
   */
  async findByUserId(userId: string) {
    return prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Add or update cart item (upsert pattern)
   */
  async upsertItem(userId: string, productId: string, quantity: number) {
    // Check if item already in cart
    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    })

    if (existing) {
      // Update quantity (add to existing)
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { product: true },
      })
    } else {
      // Create new cart item
      return prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
        },
        include: { product: true },
      })
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(cartItemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true },
    })
  }

  /**
   * Remove cart item
   */
  async removeItem(cartItemId: string) {
    return prisma.cartItem.delete({
      where: { id: cartItemId },
    })
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string) {
    return prisma.cartItem.deleteMany({
      where: { userId },
    })
  }
}

export const cartRepository = new CartRepository()
