import { prisma } from '~/lib/prisma'
import { userAnalyticsService } from './UserAnalyticsService'
import { revenueAnalyticsService } from './RevenueAnalyticsService'
import { subDays } from 'date-fns'

/**
 * AnalyticsService - Orchestration Layer
 *
 * This service acts as an ORCHESTRATOR that combines data from:
 * - UserAnalyticsService (user behavior and lifecycle metrics)
 * - RevenueAnalyticsService (revenue and order metrics)
 *
 * ARCHITECTURE PATTERN: Composition over Implementation
 * - Does NOT implement analytics logic directly
 * - Delegates to specialized services
 * - Combines results into unified dashboard data
 * - Provides convenience methods for common dashboard needs
 *
 * WHY THIS PATTERN?
 * - Clear separation of concerns (user vs revenue analytics)
 * - Services can be used independently or together
 * - Easier testing (mock individual services)
 * - Better maintainability (changes isolated to specific domains)
 *
 * PERFORMANCE:
 * - Parallel queries with Promise.all when fetching from multiple services
 * - Result caching (implement in router layer)
 */

class AnalyticsService {
  // ============================================
  // COMPREHENSIVE DASHBOARD DATA
  // ============================================

  /**
   * Get comprehensive analytics dashboard data
   *
   * This is the main orchestration method that combines:
   * - User analytics (UserAnalyticsService)
   * - Revenue analytics (RevenueAnalyticsService)
   *
   * @returns Complete dashboard data with KPIs, trends, and insights
   */
  async getComprehensiveDashboard() {
    // Fetch data from both specialized services in parallel
    const [userSummary, revenueSummary, churnAnalysis] = await Promise.all([
      userAnalyticsService.getDashboardSummary(),
      revenueAnalyticsService.getRevenueSummary(),
      userAnalyticsService.getChurnAnalysis(),
    ])

    // Calculate combined KPIs
    const kpis = {
      totalUsers: {
        label: 'Total Users',
        value: userSummary.totalUsers,
        change: userSummary.growthRate,
        trend: this.getTrend(userSummary.growthRate),
        format: 'number' as const,
      },
      activeUsers: {
        label: 'Active Users (30d)',
        value: userSummary.activeUsers,
        change: 0, // Could calculate if we stored historical data
        trend: 'neutral' as const,
        format: 'number' as const,
      },
      newUsersThisMonth: {
        label: 'New Users This Month',
        value: userSummary.newUsersThisMonth,
        change: userSummary.growthRate,
        trend: this.getTrend(userSummary.growthRate),
        format: 'number' as const,
      },
      totalRevenue: {
        label: 'Total Revenue (30d)',
        value: revenueSummary.totalRevenue,
        change: this.calculatePercentageChange(
          revenueSummary.totalRevenue,
          revenueSummary.previousRevenue
        ),
        trend: this.getTrend(
          this.calculatePercentageChange(
            revenueSummary.totalRevenue,
            revenueSummary.previousRevenue
          )
        ),
        format: 'currency' as const,
      },
      avgRevenuePerUser: {
        label: 'Avg Revenue Per User',
        value: revenueSummary.avgRevenuePerUser,
        change: 0,
        trend: 'neutral' as const,
        format: 'currency' as const,
      },
      churnRate: {
        label: 'Churn Rate',
        value: churnAnalysis.churnRate,
        change: 0,
        trend: 'neutral' as const,
        format: 'percentage' as const,
      },
    }

    return {
      kpis,
      churnAnalysis,
      userSummary,
      revenueSummary,
    }
  }

  // ============================================
  // DELEGATED METHODS (Convenience wrappers)
  // ============================================

  /**
   * Get user registration trends for all granularities
   *
   * NOTE: The UserGrowthChart component needs data for all three periods
   * (daily, weekly, monthly) to allow users to switch between views.
   *
   * We fetch all three in parallel for performance, then transform the data
   * to match the component's expected format.
   *
   * @returns Object with daily, weekly, and monthly trend data
   */
  async getUserGrowth() {
    const startDate = subDays(new Date(), 90)
    const endDate = new Date()

    // Fetch all three granularities in parallel
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      userAnalyticsService.getRegistrationTrends({
        startDate,
        endDate,
        granularity: 'day',
      }),
      userAnalyticsService.getRegistrationTrends({
        startDate,
        endDate,
        granularity: 'week',
      }),
      userAnalyticsService.getRegistrationTrends({
        startDate,
        endDate,
        granularity: 'month',
      }),
    ])

    // Transform to match UserGrowthData interface expected by component
    return {
      daily: dailyData.map((item) => ({
        date: item.date,
        value: item.count,
        label: item.date,
      })),
      weekly: weeklyData.map((item) => ({
        date: item.date,
        value: item.count,
        label: item.date,
      })),
      monthly: monthlyData.map((item) => ({
        date: item.date,
        value: item.count,
        label: item.date,
      })),
    }
  }

  /**
   * Get revenue trends over time
   * Delegates to RevenueAnalyticsService
   */
  async getRevenueGrowth() {
    return revenueAnalyticsService.getRevenueTrends({
      startDate: subDays(new Date(), 90),
      endDate: new Date(),
      granularity: 'day',
    })
  }

  /**
   * Get users at risk of churning with enriched data
   *
   * ORCHESTRATION PATTERN: This method demonstrates cross-domain data enrichment
   * - UserAnalyticsService provides: userId, name, email, lastLoginAt, daysSinceLastLogin
   * - RevenueAnalyticsService provides: totalSpent (via order aggregation)
   * - AnalyticsService calculates: riskScore (weighted algorithm)
   *
   * This is a perfect example of the orchestrator's role: combining data from
   * multiple specialized services to create a complete business view.
   *
   * @param limit Maximum number of at-risk users to return
   * @returns Enriched churn risk users with spending data and risk scores
   */
  async getChurnRiskUsers(limit: number = 20) {
    // Get at-risk users from UserAnalyticsService
    const churnAnalysis = await userAnalyticsService.getChurnAnalysis()
    const atRiskUsers = churnAnalysis.atRiskUsers.slice(0, limit)

    if (atRiskUsers.length === 0) {
      return []
    }

    // Get total spent for each at-risk user (revenue domain)
    const userIds = atRiskUsers.map((u) => u.userId)
    const userSpending = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'DELIVERED', // Only count completed orders
      },
      _sum: {
        total: true,
      },
    })

    // Create spending map for quick lookup
    const spendingMap = new Map(
      userSpending.map((s) => [s.userId, s._sum?.total || 0])
    )

    // Enrich with spending data and calculate risk scores
    return atRiskUsers
      .map((user) => {
        const totalSpent = spendingMap.get(user.userId) || 0

        // Calculate risk score (0-100)
        // Factors:
        // - Days since login (50% weight): More days = higher risk
        // - Total spent (50% weight): Less spending = higher risk (less invested)
        const daysSinceLoginScore = Math.min(
          (user.daysSinceLastLogin / 60) * 50,
          50
        ) // Max 50 points at 60+ days
        const spendingScore =
          totalSpent === 0
            ? 50 // Never purchased = maximum risk
            : Math.max(50 - (totalSpent / 1000) * 10, 0) // Reduce risk by $100 spent

        const riskScore = Math.round(daysSinceLoginScore + spendingScore)

        return {
          id: user.userId,
          name: user.name,
          email: user.email,
          lastLoginAt: user.lastLogin,
          daysSinceLogin: user.daysSinceLastLogin,
          totalSpent,
          riskScore,
        }
      })
      .sort((a, b) => b.riskScore - a.riskScore) // Sort by risk (highest first)
  }

  /**
   * Get top customers by revenue
   * Delegates to RevenueAnalyticsService
   */
  async getTopCustomers(limit: number = 20) {
    return revenueAnalyticsService.getTopCustomers(limit)
  }

  /**
   * Get user segmentation (behavior-focused)
   * Delegates to UserAnalyticsService
   */
  async getUserSegmentation() {
    return userAnalyticsService.getUserSegmentation()
  }

  /**
   * Get revenue segmentation (spending-focused)
   * Delegates to RevenueAnalyticsService
   */
  async getRevenueSegmentation() {
    return revenueAnalyticsService.getRevenueSegmentation()
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate percentage change between two values.
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Determine trend direction from percentage change.
   */
  private getTrend(change: number): 'up' | 'down' | 'neutral' {
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'neutral'
  }
}

export const analyticsService = new AnalyticsService()
