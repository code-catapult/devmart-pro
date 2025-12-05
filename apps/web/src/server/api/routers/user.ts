import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc'
import { prisma } from '~/lib/prisma'
import { Role } from '@repo/shared/types'
import { auditLogService } from '../../services/AuditLogService'

export const userRouter = createTRPCRouter({
  // Get current user profile (protected)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            cartItems: true,
            reviews: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }),

  // Update user profile (protected)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').optional(),
        email: z.email('Invalid email address').optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email } = input

      // Get current user data for comparison (before changes)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { name: true, email: true },
      })

      if (!currentUser) {
        throw new Error('User not found')
      }

      // Check if email is already taken (if changing email)
      if (email && email !== ctx.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        if (existingUser) {
          throw new Error('Email address is already in use')
        }
      }

      // Track what changed for logging
      const changes: string[] = []
      const changeDetails: Record<string, { old: string | null; new: string }> =
        {}

      if (name !== undefined && name !== currentUser.name) {
        changes.push('name')
        changeDetails.name = { old: currentUser.name, new: name }
      }

      if (email !== undefined && email.toLowerCase() !== currentUser.email) {
        changes.push('email')
        changeDetails.email = {
          old: currentUser.email,
          new: email.toLowerCase(),
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      })

      // Log profile update activity (async, non-blocking)
      if (changes.length > 0) {
        void auditLogService.logActivity({
          userId: ctx.user.id,
          action: 'PROFILE_UPDATED',
          metadata: {
            fields: changes,
            changes: changeDetails,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        })
      }

      return updatedUser
    }),

  /**
   * Update user preferences (theme)
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { theme } = input
      const userId = ctx.session.user.id

      await prisma.user.update({
        where: { id: userId },
        data: { theme },
      })

      return { success: true, theme }
    }),

  /**
   * Get user preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { theme: true },
    })

    return { theme: user?.theme || 'SYSTEM' }
  }),

  // Get user's order history (protected)
  getOrderHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input
      const skip = (page - 1) * limit

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId: ctx.user.id },
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.order.count({
          where: { userId: ctx.user.id },
        }),
      ])

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Admin: Get all users
  getAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(Role).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, search, role } = input
      const skip = (page - 1) * limit

      const where = {
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(role && { role }),
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true,
                cartItems: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ])

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Admin: Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
        role: z.enum(Role),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, role } = input

      // Prevent demoting the last admin
      if (role === Role.USER) {
        const adminCount = await prisma.user.count({
          where: { role: Role.ADMIN },
        })

        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        })

        if (targetUser?.role === Role.ADMIN && adminCount <= 1) {
          throw new Error('Cannot demote the last admin user')
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      })

      return updatedUser
    }),
})
