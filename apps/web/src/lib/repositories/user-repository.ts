import { prisma } from '../prisma'
import { Role } from '@prisma/client'

export class UserRepository {
  // Create new user
  static async createUser(data: {
    email: string
    passwordHash: string
    name?: string
    role?: Role
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role || Role.USER,
      },
    })
  }

  // Find user by email
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    })
  }

  // Get user with order history
  static async getUserWithOrders(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  // Update user profile
  static async updateProfile(
    userId: string,
    data: {
      name?: string
      email?: string
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    })
  }

  // Update user password (for password reset)
  static async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }
}
