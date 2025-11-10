import { prisma } from '~/lib/prisma'
import { type Prisma } from '@prisma/client'
import { Role } from '@repo/shared/types'

export class UserAdminService {
  /**
   * List users with search, filtering, sorting, and pagination
   *
   * @param params Search, filter, sort, and pagination parameters
   * @returns Paginated user list with order statistics
   */
  async listUsers(params: {
    search?: string
    role?: 'ALL' | 'USER' | 'ADMIN'
    status?: 'ALL' | 'ACTIVE' | 'SUSPENDED'
    sortBy?: 'name' | 'email' | 'createdAt' | 'totalSpent'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }) {
    const {
      search,
      role = 'ALL',
      status = 'ALL',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = params

    // Build where clause for filtering
    const where: Prisma.UserWhereInput = {
      // Search filter (name OR email contains search term)
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Role filter
      ...(role !== 'ALL' && { role: role as Role }),
      // Status filter (suspended true/false)
      ...(status === 'ACTIVE' && { suspended: false }),
      ...(status === 'SUSPENDED' && { suspended: true }),
    }

    // Execute queries in parallel for performance
    const [users, totalCount] = await Promise.all([
      // Get users with relations for statistics
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: { orders: true }, // Count orders efficiently
          },
          orders: {
            where: { status: 'DELIVERED' }, // Only count completed orders for revenue
            select: {
              total: true,
            },
          },
        },
        // Pagination
        skip: (page - 1) * limit,
        take: limit,
        // Sorting (handle totalSpent separately since it's computed)
        ...(sortBy !== 'totalSpent' && {
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
      }),
      // Get total count for pagination
      prisma.user.count({ where }),
    ])

    // Calculate totalSpent for each user (sum of delivered order totals)
    let usersWithStats = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      suspended: user.suspended,
      suspendedAt: user.suspendedAt,
      suspensionReason: user.suspensionReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      orderCount: user._count.orders,
      totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0),
    }))

    // Sort by totalSpent if requested (can't do in database since it's computed)
    if (sortBy === 'totalSpent') {
      usersWithStats = usersWithStats.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.totalSpent - b.totalSpent
          : b.totalSpent - a.totalSpent
      })
    }

    return {
      users: usersWithStats,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  /**
   * Get detailed user profile with all relations
   *
   * @param userId User ID
   * @returns User with orders, support notes, activity logs, and statistics
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 orders for profile view
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        // Support notes will be loaded separately via SupportService
        // Activity logs will be loaded separately via AuditLogService
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!user) {
      return null
    }

    // Calculate statistics
    const totalSpent = user.orders
      .filter((order) => order.status === 'DELIVERED')
      .reduce((sum, order) => sum + order.total, 0)

    const averageOrderValue =
      user.orders.length > 0 ? totalSpent / user.orders.length : 0

    // Get last login from activity log (if exists)
    const lastLoginActivity = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'LOGIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      ...user,
      orderCount: user._count.orders,
      totalSpent,
      averageOrderValue,
      lastLogin: lastLoginActivity?.createdAt,
    }
  }

  /**
   * Update user role with validation
   *
   * @param userId User ID
   * @param newRole New role (USER or ADMIN)
   * @returns Updated user with previous role for audit logging
   */
  async updateRole(userId: string, newRole: Role) {
    // Get current user to track old role for audit
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!currentUser) {
      throw new Error('User not found')
    }

    const previousRole = currentUser.role

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    })

    return {
      ...updatedUser,
      previousRole, // Include for audit logging
    }
  }

  /**
   * Suspend user account
   *
   * Side effects:
   * - Sets suspended flag and metadata
   * - User will be blocked from access when JWT is validated (no session invalidation needed)
   *
   * @param userId User ID
   * @param reason Suspension reason
   * @param notes Optional admin notes
   * @returns Suspended user
   */
  async suspendAccount(userId: string, reason: string, notes?: string) {
    // Update user record with suspension details
    // Note: Using JWT auth, so no sessions to invalidate
    // Suspended users will be blocked at auth middleware level
    const suspendedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        suspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason,
        // Store admin notes in a JSON field if available, or in suspensionReason
        ...(notes && { suspensionReason: `${reason}: ${notes}` }),
      },
    })
    return suspendedUser
  }

  /**
   * Activate suspended user account
   *
   * @param userId User ID
   * @returns Activated user
   */
  async activateAccount(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        suspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
    })
  }

  /**
   * Get user statistics for analytics
   *
   * @param userId User ID
   * @returns User statistics (order count, total spent, average order value, last login)
   */
  async getUserStatistics(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          where: { status: 'DELIVERED' },
          select: { total: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0)
    const averageOrderValue =
      user.orders.length > 0 ? totalSpent / user.orders.length : 0

    // Get last login
    const lastLoginActivity = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'LOGIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      userId: user.id,
      totalOrders: user._count.orders,
      completedOrders: user.orders.length,
      totalSpent,
      averageOrderValue,
      lastLogin: lastLoginActivity?.createdAt || null,
    }
  }

  /**
   * Count total admin users
   * Used for validation before demoting admins
   *
   * @returns Number of admin users
   */
  async countAdmins(): Promise<number> {
    return await prisma.user.count({
      where: { role: 'ADMIN' },
    })
  }
}

export const userAdminService = new UserAdminService()
