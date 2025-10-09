import { prisma } from '~/lib/prisma'
import { Prisma } from '@prisma/client'

export class OrderRepository {
  /**
   * Create order with items in transaction
   */
  async createOrder(data: {
    userId: string
    orderNumber: string
    shippingAddress: Prisma.InputJsonValue
    subtotal: number
    tax: number
    shipping: number
    total: number
    stripePaymentIntentId: string
    items: Array<{
      productId: string
      quantity: number
      price: number
    }>
  }) {
    return await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          orderNumber: data.orderNumber,
          shippingAddress: data.shippingAddress,
          subtotal: data.subtotal,
          tax: data.tax,
          shipping: data.shipping,
          total: data.total,
          stripePaymentIntentId: data.stripePaymentIntentId,
          status: 'PROCESSING',
        },
      })

      // Create order items
      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      })

      // Reduce inventory
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Clear user's cart
      await tx.cartItem.deleteMany({
        where: { userId: data.userId },
      })

      // Return order with items
      return await tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      })
    })
  }

  /**
   * Generate unique order number
   */
  generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }

  /**
   * Get order by ID
   */
  async findById(orderId: string) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })
  }

  /**
   * Get user orders
   */
  async findByUserId(userId: string) {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}

export const orderRepository = new OrderRepository()
