'use client'

import { useState, useMemo } from 'react'
import { api } from '@/utils/api'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency } from '@repo/shared/utils'

// Date range options
const DATE_RANGES = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  all: { label: 'All Time', days: null },
} as const

type DateRangeKey = keyof typeof DATE_RANGES

// Colors for charts
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.warning,
  PROCESSING: COLORS.primary,
  SHIPPED: COLORS.purple,
  DELIVERED: COLORS.success,
  CANCELLED: COLORS.danger,
}

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('30d')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Calculate date range with useMemo to prevent infinite re-renders
  const { startDate, endDate } = useMemo(() => {
    const config = DATE_RANGES[dateRange]
    if (!config.days) return { startDate: undefined, endDate: undefined }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - config.days)

    return { startDate, endDate }
  }, [dateRange])

  // Fetch analytics data
  const {
    data: analytics,
    isLoading,
    refetch,
    isFetching,
    error,
  } = api.admin.orders.getOrderAnalytics.useQuery(
    {
      startDate,
      endDate,
      period,
    },
    {
      // Add a timeout to prevent hanging
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    }
  )

  if (isLoading) {
    return <AnalyticsLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">Error loading analytics</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Order insights and performance metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRangeKey)}
          >
            <SelectTrigger className="w-[140px] sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period Selector */}
          <Select
            value={period}
            onValueChange={(value) =>
              setPeriod(value as 'daily' | 'weekly' | 'monthly')
            }
          >
            <SelectTrigger className="w-[100px] sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* KPI Cards - Mobile Optimized */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.averageOrderValue > 0 && (
                <>Avg order: {formatCurrency(analytics.averageOrderValue)}</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {analytics.totalOrders}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.statusBreakdown.find((s) => s.status === 'DELIVERED')
                ?.count || 0}{' '}
              completed
            </p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Orders
            </CardTitle>
            <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {analytics.statusBreakdown.find((s) => s.status === 'PENDING')
                ?.count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {analytics.topCustomers.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">With orders in period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 - Mobile Optimized */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `$${value}`}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Status (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {analytics.statusBreakdown.map((entry, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || COLORS.primary}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Mobile Optimized */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Order Volume by Period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Order Volume</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="orderCount"
                  fill={COLORS.primary}
                  name="Orders"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {analytics.topCustomers.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.userId}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs sm:text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {customer.name || customer.email}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-sm sm:text-base">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                  </div>
                </div>
              ))}
              {analytics.topCustomers.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">
                  No customer data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Loading skeleton component - Mobile Optimized
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="h-16 sm:h-20 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 sm:h-32 animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[350px] sm:h-[400px] animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>
    </div>
  )
}
