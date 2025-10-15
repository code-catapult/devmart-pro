import { prisma } from '~/lib/prisma'

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
      totalSales: salesResult._sum.total ?? 0, // In cents, handle null
      totalOrders: ordersCount,
      totalProducts: productsCount,
      totalUsers: usersCount,
    }
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

    // Fetch orders with user and order items
    const orders = await prisma.order.findMany({
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
    })

    // Get total count for pagination metadata
    const totalCount = await prisma.order.count()

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
    // Default to last 30 days if no dates provided
    const end = endDate ?? new Date()
    const start =
      startDate ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch delivered orders in date range
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: start,
          lte: end,
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
    const grouped = this.groupOrdersByPeriod(orders, period)

    return grouped
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
        periodKey = order.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (period === 'weekly') {
        // Get Monday of the week
        const date = new Date(order.createdAt)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        const monday = new Date(date.setDate(diff))
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
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        inventory: {
          lte: threshold, // Less than or equal to threshold
        },
      },
      orderBy: {
        inventory: 'asc', // Lowest inventory first (highest priority)
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
  }
}

// Export singleton instance
export const adminService = new AdminService()
