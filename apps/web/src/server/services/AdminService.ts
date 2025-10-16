import { prisma } from '~/lib/prisma'
import { getCachedData } from '~/lib/cache'

/**
 * AdminService
 *
 * Encapsulates business logic for admin dashboard operations.
 * Handles database aggregations, analytics calculations, and data transformations.
 *
 * All methods use Prisma aggregations for performance (avoids N+1 queries).
 */
export class AdminService {
  /**
   * Calculate dashboard metrics (KPIs)
   *
   * Aggregates total sales, orders, products, and users for overview cards.
   * Sales total only includes DELIVERED orders (completed transactions).
   *
   * @returns Dashboard metrics object
   */
  async calculateDashboardMetrics() {
    return getCachedData(
      'admin:metrics', // Cache key
      async () => {
        // Run all aggregations in parallel for performance
        const [salesResult, ordersCount, productsCount, usersCount] =
          await Promise.all([
            // Total sales from delivered orders
            prisma.order.aggregate({
              where: { status: 'DELIVERED' },
              _sum: { total: true },
            }),

            // Total order count (all statuses)
            prisma.order.count(),

            // Active products only
            prisma.product.count({
              where: { status: 'ACTIVE' },
            }),

            // Total user count
            prisma.user.count(),
          ])

        return {
          totalSales: salesResult._sum.total ?? 0,
          totalOrders: ordersCount,
          totalProducts: productsCount,
          totalUsers: usersCount,
        }
      },
      300 // 5 minute TTL (300 seconds)
    )
  }

  /**
   * Fetch recent orders with pagination
   *
   * Returns orders sorted by creation date (newest first) with user and item details.
   * Includes necessary relations for displaying in orders table.
   *
   * @param limit - Maximum orders to return (default: 10, max: 50)
   * @param page - Page number (1-indexed)
   * @returns Paginated orders with relations
   */
  async fetchRecentOrders(limit: number = 10, page: number = 1) {
    // Calculate offset for pagination
    const skip = (page - 1) * limit

    const [orders, totalCount] = await Promise.all([
      // Fetch orders with user and order items
      prisma.order.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' }, // Newest first
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      }),

      // Get total count for pagination metadata
      prisma.order.count(),
    ])

    return {
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    }
  }

  /**
   * Calculate sales analytics for charts
   *
   * Groups orders by date period and aggregates sales totals.
   * Supports daily, weekly, and monthly groupings.
   *
   * @param period - Time period for grouping ('daily' | 'weekly' | 'monthly')
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Time-series sales data
   */
  async calculateSalesAnalytics(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: Date,
    endDate?: Date
  ) {
    // Create cache key with parameters (different params = different cache)
    const start = startDate?.toISOString() ?? 'default'
    const end = endDate?.toISOString() ?? 'default'
    const cacheKey = `admin:analytics:${period}:${start}:${end}`

    return getCachedData(
      cacheKey,
      async () => {
        // Default to last 30 days if no dates provided
        const endDateFinal = endDate ?? new Date()
        const startDateFinal =
          startDate ??
          new Date(endDateFinal.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Fetch delivered orders in date range
        const orders = await prisma.order.findMany({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: startDateFinal,
              lte: endDateFinal,
            },
          },
          select: {
            createdAt: true,
            total: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        // Group by period and sum totals
        return this.groupOrdersByPeriod(orders, period)
      },
      600 // 10 minute TTL (600 seconds)
    )
  }

  /**
   * Group orders by time period
   *
   * Helper method to aggregate orders into daily, weekly, or monthly buckets.
   *
   * @param orders - Orders with createdAt and total fields
   * @param period - Grouping period
   * @returns Array of {date, sales, orders} objects
   */
  private groupOrdersByPeriod(
    orders: { createdAt: Date; total: number }[],
    period: 'daily' | 'weekly' | 'monthly'
  ) {
    const grouped = new Map<
      string,
      { date: string; sales: number; orders: number }
    >()

    for (const order of orders) {
      // Generate period key based on grouping
      let periodKey: string

      if (period === 'daily') {
        // Daily: YYYY-MM-DD
        periodKey = order.createdAt.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        // Weekly: Get Monday of the week (ISO 8601 standard)
        const date = new Date(order.createdAt)
        const day = date.getDay() // 0 = Sunday, 1 = Monday, etc.

        // Calculate days to subtract to get to Monday
        const daysToMonday = day === 0 ? 6 : day - 1 // Sunday: go back 6 days
        const mondayDate = date.getDate() - daysToMonday

        const monday = new Date(date)
        monday.setDate(mondayDate)
        periodKey = monday.toISOString().split('T')[0]
      } else {
        // Monthly: YYYY-MM
        periodKey = order.createdAt.toISOString().substring(0, 7)
      }

      // Aggregate sales and order counts
      if (grouped.has(periodKey)) {
        const existing = grouped.get(periodKey)!
        existing.sales += order.total
        existing.orders += 1
      } else {
        grouped.set(periodKey, {
          date: periodKey,
          sales: order.total,
          orders: 1,
        })
      }
    }

    // Convert map to sorted array
    return Array.from(grouped.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )
  }

  /**
   * Fetch products with low inventory
   *
   * Returns active products where inventory is at or below threshold.
   * Sorted by inventory level (lowest first) for priority restocking.
   *
   * @param threshold - Inventory level threshold (default: 10)
   * @returns Low inventory products with category info
   */
  async fetchLowInventoryProducts(threshold: number = 10) {
    const cacheKey = `admin:inventory:${threshold}`

    return getCachedData(
      cacheKey,
      async () => {
        const products = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            inventory: {
              lte: threshold,
            },
          },
          orderBy: {
            inventory: 'asc', // Lowest inventory first
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return products
      },
      300 // 5 minute TTL
    )
  }
}

// Export singleton instance
export const adminService = new AdminService()
