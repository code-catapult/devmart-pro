import { prisma } from '~/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { getCachedData, invalidateCache } from '~/lib/cache'

interface AnalyticsParams {
  startDate?: Date
  endDate?: Date
  period?: 'daily' | 'weekly' | 'monthly'
}

interface OrderStatistics {
  totalOrders: number
  totalRevenue: number // In cents
  averageOrderValue: number // In cents
  statusBreakdown: Array<{
    status: OrderStatus
    count: number
    percentage: number
  }>
  revenueByPeriod: Array<{
    date: string // ISO date string
    revenue: number
    orderCount: number
  }>
  topCustomers: Array<{
    userId: string
    name: string | null
    email: string
    totalSpent: number
    orderCount: number
  }>
}

export class OrderAnalyticsService {
  private readonly CACHE_TTL = 300 // 5 minutes in seconds

  /**
   * Get comprehensive order statistics with caching
   */
  async getOrderStatistics(params: AnalyticsParams): Promise<OrderStatistics> {
    const { startDate, endDate, period = 'daily' } = params

    // Generate cache key based on parameters
    const cacheKey = `analytics:orders:${startDate?.toISOString() || 'all'}:${
      endDate?.toISOString() || 'all'
    }:${period}`

    // Use centralized cache with fetcher pattern
    return getCachedData(
      cacheKey,
      async () => this.computeOrderStatistics(params),
      this.CACHE_TTL
    )
  }

  /**
   * Compute order statistics (called when cache misses)
   */
  private async computeOrderStatistics(
    params: AnalyticsParams
  ): Promise<OrderStatistics> {
    const { startDate, endDate, period = 'daily' } = params

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    const where =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Execute all queries in parallel
    const [
      totalOrders,
      revenueAgg,
      statusCounts,
      topCustomers,
      revenueByPeriod,
    ] = await Promise.all([
      // 1. Total order count
      prisma.order.count({ where }),

      // 2. Total revenue and average
      prisma.order.aggregate({
        where,
        _sum: { total: true },
        _avg: { total: true },
      }),

      // 3. Count by status
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),

      // 4. Top customers by total spent
      prisma.order.groupBy({
        by: ['userId'],
        where,
        _sum: { total: true },
        _count: { userId: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10, // Top 10 customers
      }),

      // 5. Revenue over time (simplified - in production use raw SQL for complex grouping)
      this.getRevenueByPeriod(period, startDate, endDate),
    ])

    // Fetch customer details for top customers
    const customerIds = topCustomers.map((c) => c.userId)
    const customers = await prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    })
    const customerMap = new Map(customers.map((c) => [c.id, c]))

    // Build response
    return {
      totalOrders,
      totalRevenue: revenueAgg._sum.total || 0,
      averageOrderValue: Math.round(revenueAgg._avg.total || 0),
      statusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.status,
        percentage: totalOrders > 0 ? (s._count.status / totalOrders) * 100 : 0,
      })),
      revenueByPeriod,
      topCustomers: topCustomers.map((c) => {
        const customer = customerMap.get(c.userId)
        return {
          userId: c.userId,
          name: customer?.name || null,
          email: customer?.email || 'Unknown',
          totalSpent: c._sum.total || 0,
          orderCount: c._count.userId,
        }
      }),
    }
  }

  /**
   * Get revenue grouped by time period
   * Note: Simplified implementation - production would use raw SQL for complex date grouping
   */
  private async getRevenueByPeriod(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ date: string; revenue: number; orderCount: number }>> {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    const where =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Fetch all orders (simplified - in production, do aggregation in database)
    const orders = await prisma.order.findMany({
      where,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by period in JavaScript (works for small-medium datasets)
    const grouped = new Map<string, { revenue: number; count: number }>()

    orders.forEach((order) => {
      const dateKey = this.getDateKey(order.createdAt, period)
      const existing = grouped.get(dateKey) || { revenue: 0, count: 0 }
      grouped.set(dateKey, {
        revenue: existing.revenue + order.total,
        count: existing.count + 1,
      })
    })

    // Convert to array and sort
    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orderCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Generate date key for grouping (YYYY-MM-DD, YYYY-WW, or YYYY-MM)
   */
  private getDateKey(
    date: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const week = Math.ceil(date.getDate() / 7)

    switch (period) {
      case 'daily':
        return `${year}-${month}-${day}`
      case 'weekly':
        return `${year}-W${String(week).padStart(2, '0')}`
      case 'monthly':
        return `${year}-${month}`
    }
  }

  /**
   * Clear analytics cache (called after order status changes)
   */
  async clearCache(): Promise<void> {
    await invalidateCache('analytics:*')
  }
}
