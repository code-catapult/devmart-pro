import { prisma } from '~/lib/prisma'
import { subDays, startOfDay, format } from 'date-fns'

/**
 * UserAnalyticsService
 *
 * Provides user analytics and business intelligence metrics.
 * Responsibilities:
 * - Calculate registration trends
 * - Analyze activity patterns
 * - Segment users by behavior and value
 * - Identify churn risks
 * - Generate top customer reports
 */
export class UserAnalyticsService {
  /**
   * Get user registration trends over time
   *
   * @param params Time period and granularity
   * @returns Array of date/count pairs for chart visualization
   */
  async getRegistrationTrends(params: {
    startDate?: Date
    endDate?: Date
    granularity?: 'day' | 'week' | 'month'
  }) {
    const {
      startDate = subDays(new Date(), 30), // Default: last 30 days
      endDate = new Date(),
      granularity = 'day',
    } = params

    // Get all users created in date range
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Group by date based on granularity
    const groupedData = new Map<string, number>()

    for (const user of users) {
      let key: string

      if (granularity === 'day') {
        key = format(user.createdAt, 'yyyy-MM-dd')
      } else if (granularity === 'week') {
        // ISO week format (YYYY-Www)
        key = format(user.createdAt, "yyyy-'W'II")
      } else {
        // month
        key = format(user.createdAt, 'yyyy-MM')
      }

      groupedData.set(key, (groupedData.get(key) || 0) + 1)
    }

    // Convert to array format for frontend charts
    return Array.from(groupedData.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get activity patterns (login frequency, active users)
   *
   * @returns Activity metrics
   */
  async getActivityPatterns() {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sevenDaysAgo = subDays(now, 7)

    // Get users who logged in recently
    const [activeLastWeek, activeLastMonth, totalUsers] = await Promise.all([
      // Active in last 7 days
      prisma.activityLog
        .findMany({
          where: {
            action: 'LOGIN',
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        })
        .then((logs) => logs.length),

      // Active in last 30 days
      prisma.activityLog
        .findMany({
          where: {
            action: 'LOGIN',
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        })
        .then((logs) => logs.length),

      // Total registered users
      prisma.user.count(),
    ])

    // Calculate login frequency distribution
    const loginCounts = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        action: 'LOGIN',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    })

    // Categorize users by login frequency
    const frequencyDistribution = {
      '1-5 logins': loginCounts.filter((u) => u._count.id <= 5).length,
      '6-10 logins': loginCounts.filter(
        (u) => u._count.id > 5 && u._count.id <= 10
      ).length,
      '11-20 logins': loginCounts.filter(
        (u) => u._count.id > 10 && u._count.id <= 20
      ).length,
      '20+ logins': loginCounts.filter((u) => u._count.id > 20).length,
    }

    return {
      totalUsers,
      activeLastWeek,
      activeLastMonth,
      activityRate: {
        weekly: totalUsers > 0 ? (activeLastWeek / totalUsers) * 100 : 0,
        monthly: totalUsers > 0 ? (activeLastMonth / totalUsers) * 100 : 0,
      },
      loginFrequencyDistribution: frequencyDistribution,
    }
  }

  /**
   * Segment users by behavior and value
   *
   * @returns User segmentation breakdown
   */
  async getUserSegmentation() {
    // Get all users with their order data
    const users = await prisma.user.findMany({
      include: {
        orders: {
          where: {
            status: 'DELIVERED', // Only completed orders for revenue
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

    // Calculate segments
    const segments = {
      byOrderCount: {
        '0 orders (never purchased)': 0,
        '1-5 orders (occasional)': 0,
        '6-10 orders (regular)': 0,
        '11+ orders (loyal)': 0,
      },
      byTotalSpent: {
        '$0 (no purchases)': 0,
        '$1-$99': 0,
        '$100-$499': 0,
        '$500-$999': 0,
        '$1000+': 0,
      },
      byActivity: {
        active: 0, // Logged in last 7 days
        occasional: 0, // Logged in 8-30 days ago
        inactive: 0, // Not logged in 30+ days
      },
    }

    // Get recent login data for activity segmentation
    const sevenDaysAgo = subDays(new Date(), 7)
    const thirtyDaysAgo = subDays(new Date(), 30)

    for (const user of users) {
      const orderCount = user._count.orders
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + order.total,
        0
      )

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
    }

    // Activity segmentation (requires activity log query)
    const recentLogins = await prisma.activityLog.findMany({
      where: {
        action: 'LOGIN',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      distinct: ['userId'],
      orderBy: {
        createdAt: 'desc',
      },
    })

    const recentLoginMap = new Map(
      recentLogins.map((log) => [log.userId, log.createdAt])
    )

    for (const user of users) {
      const lastLogin = recentLoginMap.get(user.id)

      if (!lastLogin) {
        segments.byActivity.inactive++
      } else if (lastLogin >= sevenDaysAgo) {
        segments.byActivity.active++
      } else {
        segments.byActivity.occasional++
      }
    }

    return segments
  }

  /**
   * Analyze user churn (users at risk of leaving)
   *
   * @returns Churn metrics and at-risk users
   */
  async getChurnAnalysis() {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)
    const ninetyDaysAgo = subDays(now, 90)

    // Users who haven't logged in recently
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    // Get last login for each user
    const lastLogins = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        action: 'LOGIN',
      },
      _max: {
        createdAt: true,
      },
    })

    const lastLoginMap = new Map(
      lastLogins.map((log) => [log.userId, log._max.createdAt])
    )

    // Categorize users by last activity
    const churnCategories = {
      'Active (< 30 days)': 0,
      'At risk (30-60 days)': 0,
      'Churned (60-90 days)': 0,
      'Lost (90+ days)': 0,
      'Never logged in': 0,
    }

    const atRiskUsers: Array<{
      userId: string
      email: string
      daysSinceLastLogin: number
    }> = []

    for (const user of allUsers) {
      const lastLogin = lastLoginMap.get(user.id)

      if (!lastLogin) {
        churnCategories['Never logged in']++
        continue
      }

      const daysSinceLogin = Math.floor(
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (lastLogin >= thirtyDaysAgo) {
        churnCategories['Active (< 30 days)']++
      } else if (lastLogin >= sixtyDaysAgo) {
        churnCategories['At risk (30-60 days)']++
        atRiskUsers.push({
          userId: user.id,
          email: user.email,
          daysSinceLastLogin: daysSinceLogin,
        })
      } else if (lastLogin >= ninetyDaysAgo) {
        churnCategories['Churned (60-90 days)']++
      } else {
        churnCategories['Lost (90+ days)']++
      }
    }

    // Calculate churn rate (users churned / total users)
    const totalUsers = allUsers.length
    const churnedUsers =
      churnCategories['Churned (60-90 days)'] +
      churnCategories['Lost (90+ days)']
    const churnRate = totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0

    return {
      churnRate,
      categories: churnCategories,
      atRiskUsers: atRiskUsers.slice(0, 50), // Top 50 at-risk users
    }
  }

  /**
   * Get top customers by revenue and order frequency
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
   * Get analytics summary dashboard
   * Combines key metrics for overview display
   *
   * @returns Summary metrics object
   */
  async getDashboardSummary() {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      activityPatterns,
      topCustomers,
    ] = await Promise.all([
      // Total registered users
      prisma.user.count(),

      // New users this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay(thirtyDaysAgo),
          },
        },
      }),

      // New users last month (for comparison)
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay(sixtyDaysAgo),
            lt: startOfDay(thirtyDaysAgo),
          },
        },
      }),

      // Activity patterns
      this.getActivityPatterns(),

      // Top 5 customers
      this.getTopCustomers(5),
    ])

    // Calculate growth rate
    const growthRate =
      newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 0

    return {
      totalUsers,
      newUsersThisMonth,
      growthRate,
      activeUsers: activityPatterns.activeLastMonth,
      activityRate: activityPatterns.activityRate.monthly,
      topCustomers,
    }
  }
}

export const userAnalyticsService = new UserAnalyticsService()
