import { prisma } from '~/lib/prisma'
import { subDays, startOfDay, format } from 'date-fns'
import { getCachedData } from '~/lib/cache'

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
 *
 * Performance:
 * - Upstash Redis caching (5 minute TTL)
 * - Graceful degradation if Redis unavailable
 * - Optimized Prisma queries
 * - Parallel execution with Promise.all
 */
export class UserAnalyticsService {
  // Cache TTL: 5 minutes (300 seconds)
  private readonly CACHE_TTL = 300
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
   * Segment users by behavior only (activity and registration age)
   *
   * NOTE: Revenue-based segmentation (order count, total spent) has been
   * moved to RevenueAnalyticsService to maintain clear separation of concerns.
   *
   * @returns User segmentation breakdown by activity and registration age
   */
  async getUserSegmentation() {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const thirtyDaysAgo = subDays(now, 30)
    const ninetyDaysAgo = subDays(now, 90)

    // Get all users with registration date
    const users = await prisma.user.findMany({
      select: {
        id: true,
        createdAt: true,
      },
    })

    // Calculate segments
    const segments = {
      byActivity: {
        active: 0, // Logged in last 7 days
        occasional: 0, // Logged in 8-30 days ago
        inactive: 0, // Not logged in 30+ days
      },
      byRegistrationAge: {
        new: 0, // Registered < 30 days
        established: 0, // Registered 30-90 days
        veteran: 0, // Registered 90+ days
      },
    }

    // Get recent login data for activity segmentation
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

    // Segment users by activity and registration age
    for (const user of users) {
      // Activity segmentation
      const lastLogin = recentLoginMap.get(user.id)

      if (!lastLogin) {
        segments.byActivity.inactive++
      } else if (lastLogin >= sevenDaysAgo) {
        segments.byActivity.active++
      } else {
        segments.byActivity.occasional++
      }

      // Registration age segmentation
      if (user.createdAt >= thirtyDaysAgo) {
        segments.byRegistrationAge.new++
      } else if (user.createdAt >= ninetyDaysAgo) {
        segments.byRegistrationAge.established++
      } else {
        segments.byRegistrationAge.veteran++
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
        name: true,
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
      name: string | null
      email: string
      lastLogin: Date
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
          name: user.name,
          email: user.email,
          lastLogin: lastLogin,
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
   * NOTE: getTopCustomers() method has been REMOVED.
   *
   * This revenue-focused functionality now belongs in RevenueAnalyticsService
   * to maintain clear separation of concerns:
   * - UserAnalyticsService: User behavior and lifecycle metrics
   * - RevenueAnalyticsService: Order and revenue metrics
   *
   * See RevenueAnalyticsService.getTopCustomers() in Task 11.
   */

  /**
   * Get analytics summary dashboard
   * Combines key metrics for overview display
   *
   * NOTE: This method now returns only user-focused metrics.
   * Revenue metrics (like topCustomers) are available via RevenueAnalyticsService.
   *
   * @returns Summary metrics object
   */
  async getDashboardSummary() {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)

    const [totalUsers, newUsersThisMonth, newUsersLastMonth, activityPatterns] =
      await Promise.all([
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
    }
  }

  /**
   * Get summary metrics for user analytics dashboard
   * (Alias for getDashboardSummary with simplified return format)
   *
   * Returns:
   * - Total users (all time)
   * - New users this month
   * - Active users (logged in last 30 days)
   * - Churn rate (inactive 90+ days / total users)
   *
   * Caching: 5 minute TTL via Upstash Redis
   */
  async getSummaryMetrics() {
    return getCachedData(
      'analytics:summary_metrics',
      async () => {
        const summary = await this.getDashboardSummary()

        const now = new Date()
        const ninetyDaysAgo = subDays(now, 90)

        // Calculate inactive users for churn rate
        const inactiveUsers = await prisma.user.count({
          where: {
            OR: [
              {
                activityLogs: {
                  none: {
                    action: 'LOGIN',
                    createdAt: { gte: ninetyDaysAgo },
                  },
                },
              },
              {
                activityLogs: { none: {} }, // Never logged in
              },
            ],
          },
        })

        const churnRate =
          summary.totalUsers > 0
            ? parseFloat(
                ((inactiveUsers / summary.totalUsers) * 100).toFixed(1)
              )
            : 0

        return {
          totalUsers: summary.totalUsers,
          newThisMonth: summary.newUsersThisMonth,
          activeUsers: summary.activeUsers,
          churnRate,
        }
      },
      this.CACHE_TTL
    )
  }

  /**
   * Get registration trend (simplified wrapper for getRegistrationTrends)
   * Supports Task 13's expected signature
   *
   * Caching: 5 minute TTL per period/date range combination via Upstash Redis
   */
  async getRegistrationTrend(
    startDate: Date,
    endDate: Date,
    period: 'day' | 'week' | 'month' = 'day'
  ) {
    const cacheKey = `analytics:registration_trend:${startDate.getTime()}:${endDate.getTime()}:${period}`

    return getCachedData(
      cacheKey,
      async () => {
        const data = await this.getRegistrationTrends({
          startDate,
          endDate,
          granularity: period,
        })

        // Transform to Task 13's expected format
        return data.map((item) => ({
          date: item.date,
          users: item.count,
          label:
            period === 'day'
              ? format(new Date(item.date), 'MMM dd')
              : period === 'week'
                ? `Week ${item.date.split('-W')[1]}`
                : format(new Date(item.date + '-01'), 'MMM yyyy'),
        }))
      },
      this.CACHE_TTL
    )
  }

  /**
   * Get activity patterns with login frequency distribution
   * (Enhanced version for Task 13)
   *
   * Caching: 5 minute TTL per daysBack value via Upstash Redis
   */
  async getActivityPatternsDetailed(daysBack: number = 30) {
    const cacheKey = `analytics:activity_patterns:${daysBack}`

    return getCachedData(
      cacheKey,
      async () => {
        const startDate = subDays(new Date(), daysBack)

        // Get users with login counts
        const users = await prisma.user.findMany({
          include: {
            activityLogs: {
              where: {
                action: 'LOGIN',
                createdAt: { gte: startDate },
              },
              select: { createdAt: true },
            },
          },
        })

        const patterns = {
          DAILY: 0, // 1+ login per day on average
          WEEKLY: 0, // 1+ login per week on average
          MONTHLY: 0, // 1+ login per month on average
          RARELY: 0, // < 1 login per month
        }

        users.forEach((user) => {
          const loginCount = user.activityLogs.length
          const loginsPerDay = loginCount / daysBack

          if (loginsPerDay >= 1) {
            patterns.DAILY++
          } else if (loginsPerDay >= 1 / 7) {
            patterns.WEEKLY++
          } else if (loginsPerDay >= 1 / 30) {
            patterns.MONTHLY++
          } else {
            patterns.RARELY++
          }
        })

        return [
          { pattern: 'Daily', users: patterns.DAILY },
          { pattern: 'Weekly', users: patterns.WEEKLY },
          { pattern: 'Monthly', users: patterns.MONTHLY },
          { pattern: 'Rarely', users: patterns.RARELY },
        ]
      },
      this.CACHE_TTL
    )
  }

  /**
   * Get simplified churn analysis for Task 13
   *
   * Caching: 5 minute TTL via Upstash Redis
   */
  async getChurnAnalysisSimplified() {
    return getCachedData(
      'analytics:churn_analysis',
      async () => {
        const now = new Date()
        const thirtyDaysAgo = subDays(now, 30)
        const sixtyDaysAgo = subDays(now, 60)
        const ninetyDaysAgo = subDays(now, 90)

        const [atRiskCount, churnedCount] = await Promise.all([
          // At risk: Last login 30-60 days ago
          prisma.user.count({
            where: {
              activityLogs: {
                some: {
                  action: 'LOGIN',
                  createdAt: {
                    gte: sixtyDaysAgo,
                    lt: thirtyDaysAgo,
                  },
                },
              },
              NOT: {
                activityLogs: {
                  some: {
                    action: 'LOGIN',
                    createdAt: { gte: thirtyDaysAgo },
                  },
                },
              },
            },
          }),

          // Churned: No login in 90+ days
          prisma.user.count({
            where: {
              OR: [
                {
                  activityLogs: {
                    none: {
                      action: 'LOGIN',
                      createdAt: { gte: ninetyDaysAgo },
                    },
                  },
                },
                {
                  activityLogs: { none: {} }, // Never logged in
                },
              ],
            },
          }),
        ])

        return {
          atRisk: atRiskCount,
          churned: churnedCount,
        }
      },
      this.CACHE_TTL
    )
  }
}

export const userAnalyticsService = new UserAnalyticsService()
