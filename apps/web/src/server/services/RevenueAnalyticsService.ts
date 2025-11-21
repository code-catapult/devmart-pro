import { prisma } from '~/lib/prisma'
import { subDays, format } from 'date-fns'

/**
 * RevenueAnalyticsService
 *
 * Provides revenue and order analytics.
 * This service focuses exclusively on monetary metrics and purchasing behavior.
 *
 * Responsibilities:
 * - Calculate revenue trends over time
 * - Analyze customer lifetime value (CLV)
 * - Segment users by spending and order frequency
 * - Identify top customers by revenue
 * - Track average order value (AOV) metrics
 *
 * NOTE: This service works alongside UserAnalyticsService:
 * - UserAnalyticsService: User behavior and lifecycle metrics
 * - RevenueAnalyticsService: Revenue and order metrics
 * - AnalyticsService: Orchestrates both for unified dashboard
 */
export class RevenueAnalyticsService {
  /**
   * Get revenue trends over time
   *
   * @param params Time period and granularity
   * @returns Array of date/revenue pairs for chart visualization
   */
  async getRevenueTrends(params: {
    startDate?: Date
    endDate?: Date
    granularity?: 'day' | 'week' | 'month'
  }) {
    const {
      startDate = subDays(new Date(), 30),
      endDate = new Date(),
      granularity = 'day',
    } = params

    // Get all delivered orders in date range
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: startDate,
          lte: endDate,
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

    // Group by date based on granularity
    const groupedData = new Map<string, number>()

    for (const order of orders) {
      let key: string

      if (granularity === 'day') {
        key = format(order.createdAt, 'yyyy-MM-dd')
      } else if (granularity === 'week') {
        key = format(order.createdAt, "yyyy-'W'II")
      } else {
        key = format(order.createdAt, 'yyyy-MM')
      }

      groupedData.set(key, (groupedData.get(key) || 0) + order.total)
    }

    // Convert to array format for frontend charts
    return Array.from(groupedData.entries())
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get top customers by revenue
   *
   * @param limit Number of customers to return
   * @returns Top customers ranked by total spent
   */
  async getTopCustomers(limit: number = 20) {
    const users = await prisma.user.findMany({
      include: {
        orders: {
          where: {
            status: 'DELIVERED',
          },
          select: {
            total: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    // Calculate metrics for each user
    const usersWithMetrics = users
      .map((user) => {
        const totalSpent = user.orders.reduce(
          (sum, order) => sum + order.total,
          0
        )
        const orderCount = user._count.orders

        // Calculate average order value
        const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0

        // Calculate recency (days since last order)
        const lastOrderDate =
          user.orders.length > 0
            ? Math.max(...user.orders.map((o) => o.createdAt.getTime()))
            : null

        const daysSinceLastOrder = lastOrderDate
          ? Math.floor((Date.now() - lastOrderDate) / (1000 * 60 * 60 * 24))
          : null

        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          totalSpent,
          orderCount,
          avgOrderValue,
          daysSinceLastOrder,
        }
      })
      .filter((user) => user.totalSpent > 0) // Only users who have purchased
      .sort((a, b) => b.totalSpent - a.totalSpent) // Sort by total spent descending
      .slice(0, limit)

    return usersWithMetrics
  }

  /**
   * Get revenue segmentation (users by spending tiers)
   *
   * @returns Revenue segmentation breakdown
   */
  async getRevenueSegmentation() {
    const users = await prisma.user.findMany({
      include: {
        orders: {
          where: {
            status: 'DELIVERED',
          },
          select: {
            total: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    const segments = {
      byTotalSpent: {
        '$0 (no purchases)': 0,
        '$1-$99': 0,
        '$100-$499': 0,
        '$500-$999': 0,
        '$1000+': 0,
      },
      byOrderCount: {
        '0 orders (never purchased)': 0,
        '1-5 orders (occasional)': 0,
        '6-10 orders (regular)': 0,
        '11+ orders (loyal)': 0,
      },
    }

    for (const user of users) {
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + order.total,
        0
      )
      const orderCount = user._count.orders

      // Segment by total spent (in cents, so divide by 100 for dollars)
      const totalDollars = totalSpent / 100
      if (totalDollars === 0) {
        segments.byTotalSpent['$0 (no purchases)']++
      } else if (totalDollars < 100) {
        segments.byTotalSpent['$1-$99']++
      } else if (totalDollars < 500) {
        segments.byTotalSpent['$100-$499']++
      } else if (totalDollars < 1000) {
        segments.byTotalSpent['$500-$999']++
      } else {
        segments.byTotalSpent['$1000+']++
      }

      // Segment by order count
      if (orderCount === 0) {
        segments.byOrderCount['0 orders (never purchased)']++
      } else if (orderCount <= 5) {
        segments.byOrderCount['1-5 orders (occasional)']++
      } else if (orderCount <= 10) {
        segments.byOrderCount['6-10 orders (regular)']++
      } else {
        segments.byOrderCount['11+ orders (loyal)']++
      }
    }

    return segments
  }

  /**
   * Get revenue summary metrics
   *
   * @returns Summary of key revenue metrics
   */
  async getRevenueSummary() {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)

    const [
      totalRevenue30d,
      totalRevenuePrevious30d,
      orderCount30d,
      totalUsers,
    ] = await Promise.all([
      // Revenue last 30 days
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Revenue previous 30 days
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
        _sum: { total: true },
      }),

      // Order count
      prisma.order.count({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Total users for ARPU calculation
      prisma.user.count(),
    ])

    const revenue = totalRevenue30d._sum.total || 0
    const previousRevenue = totalRevenuePrevious30d._sum.total || 0
    const avgRevenuePerUser = totalUsers > 0 ? revenue / totalUsers : 0
    const avgOrderValue = orderCount30d > 0 ? revenue / orderCount30d : 0

    return {
      totalRevenue: revenue,
      previousRevenue,
      avgRevenuePerUser,
      avgOrderValue,
      orderCount: orderCount30d,
    }
  }
}

export const revenueAnalyticsService = new RevenueAnalyticsService()
