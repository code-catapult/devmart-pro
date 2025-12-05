/**
 * Analytics Types
 *
 * These types define the shape of analytics data for the dashboard.
 */

export interface KPIMetric {
  label: string
  value: number | string
  change?: number // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral'
  format: 'number' | 'currency' | 'percentage'
}

export interface TimeSeriesDataPoint {
  date: string // ISO date string "2024-01-15"
  value: number
  label?: string // Optional label for tooltip
}

export interface UserGrowthData {
  daily: TimeSeriesDataPoint[]
  weekly: TimeSeriesDataPoint[]
  monthly: TimeSeriesDataPoint[]
}

export interface RevenueMetrics {
  totalRevenue: number
  averageRevenuePerUser: number
  revenueByMonth: TimeSeriesDataPoint[]
  topSpenders: {
    userId: string
    userName: string
    totalSpent: number
    orderCount: number
  }[]
}

export interface UserSegmentation {
  byRole: { role: string; count: number; percentage: number }[]
  byStatus: { status: string; count: number; percentage: number }[]
  byCountry: { country: string; count: number; percentage: number }[]
}

export interface CohortData {
  cohort: string // "Jan 2024"
  month0: number // Always 100%
  month1: number | null // Percentage retained
  month2: number | null
  month3: number | null
  size: number // Original cohort size
}

export interface ChurnRiskUser {
  id: string
  name: string | null
  email: string
  lastLoginAt: Date
  daysSinceLogin: number
  totalSpent: number
  riskScore: number // 0-100, higher = more likely to churn
}

export interface AnalyticsDashboardData {
  kpis: {
    totalUsers: KPIMetric
    activeUsers: KPIMetric
    newUsersToday: KPIMetric
    totalRevenue: KPIMetric
    avgRevenuePerUser: KPIMetric
    churnRate: KPIMetric
  }
  userGrowth: UserGrowthData
  revenue: RevenueMetrics
  segmentation: UserSegmentation
  cohorts: CohortData[]
  churnRisk: ChurnRiskUser[]
}
