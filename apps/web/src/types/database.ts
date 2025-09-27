import { Prisma } from '@prisma/client'

// Product with category and review count
export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true
    _count: {
      select: {
        reviews: true
      }
    }
  }
}>

// Product with full details including reviews
export type ProductWithDetails = Prisma.ProductGetPayload<{
  include: {
    category: true
    reviews: {
      include: {
        user: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
  }
}>

// User with cart items
export type UserWithCart = Prisma.UserGetPayload<{
  include: {
    cartItems: {
      include: {
        product: true
      }
    }
  }
}>

// User with order history
export type UserWithOrders = Prisma.UserGetPayload<{
  include: {
    orders: {
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    }
  }
}>

// Order with items
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: true
      }
    }
    user: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>
