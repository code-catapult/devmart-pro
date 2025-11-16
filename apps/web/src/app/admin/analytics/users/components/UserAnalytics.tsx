'use client'

import { useMemo } from 'react'
import { api } from '~/utils/api'
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Users,
  UserPlus,
  Activity,
  TrendingDown,
  Download,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import AnalyticsNav from '../../components/AnalyticsNav'
import { useAnalytics, DATE_RANGES } from '../../AnalyticsContext'

/**
 * UserAnalytics Component
 *
 * Comprehensive analytics dashboard for user metrics and insights.
 * Features:
 * - Summary metrics cards (total, new, active, churn)
 * - Registration trend line chart with period selector
 * - User segmentation pie chart
 * - Top customers table
 * - Activity patterns bar chart
 * - CSV export functionality
 */
export function UserAnalytics() {
  // Get shared analytics state from context
  const { dateRange, setDateRange, period, setPeriod, startDate, endDate } =
    useAnalytics()

  // Map the period from context format ('daily'/'weekly'/'monthly') to API format ('day'/'week'/'month')
  const apiPeriod: 'day' | 'week' | 'month' = useMemo(() => {
    return period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'
  }, [period])

  // Memoize query parameters to prevent unnecessary refetches
  const queryParams = useMemo(() => {
    return {
      startDate,
      endDate,
      period: apiPeriod,
    }
  }, [startDate, endDate, apiPeriod])

  // Fetch all analytics data in a single optimized query with caching
  // This reduces network overhead from 6 separate requests to 1
  // Caching strategy:
  // - staleTime: 5 minutes - data is considered fresh for 5 minutes
  // - gcTime: 30 minutes - cache persists for 30 minutes after last use
  // - refetchOnWindowFocus: false - don't refetch when user returns to tab
  // - placeholderData: true - show old data while fetching new data (smooth transitions)
  const analytics = api.admin.userManagement.getUserAnalyticsAll.useQuery(
    queryParams,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache persists (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch if data exists in cache
      refetchOnReconnect: false, // Don't refetch on network reconnect
      placeholderData: (previousData) => previousData, // Keep previous data while fetching
    }
  )

  // Destructure data for easier access
  const summary = analytics.data?.summary
  const registrationTrend = analytics.data?.registrationTrend
  const segmentation = analytics.data?.segmentation
  const topCustomers = analytics.data?.topCustomers
  const activityPatterns = analytics.data?.activityPatterns
  const churnAnalysis = analytics.data?.churnAnalysis

  // Export analytics to CSV
  const handleExport = () => {
    if (!registrationTrend) return

    const csvContent = [
      ['Date', 'New Users'], // Header
      ...registrationTrend.map((row) => [row.date, row.users.toString()]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `user-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Background refresh indicator */}
      {/* {analytics.isFetching && !analytics.isLoading && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Refreshing data...</span>
        </div>
      )} */}

      {/* Header with Date Range, Period, Export and Refresh Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">User Analytics</h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Insights into user growth, engagement, and behavior
          </p>
          {/* Last time since data updated */}
          {analytics.dataUpdatedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated:{' '}
              {format(new Date(analytics.dataUpdatedAt), 'MMM dd, yyyy h:mm a')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={setDateRange}>
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
          <Select value={period} onValueChange={setPeriod}>
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
            onClick={() => analytics.refetch()}
            variant="outline"
            size="icon"
            disabled={analytics.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${analytics.isFetching ? 'animate-spin' : ''}`}
            />
          </Button>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            variant="outline"
            size="icon"
            disabled={!registrationTrend}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <AnalyticsNav />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">
              {summary?.totalUsers.toLocaleString() || '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">All registered users</p>
          </CardContent>
        </Card>

        {/* New This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              New This Month
            </CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              +{summary?.newThisMonth.toLocaleString() || '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Since{' '}
              {format(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                'MMM 1'
              )}
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {summary?.activeUsers.toLocaleString() || '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Logged in last 30 days</p>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              Churn Rate
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-red-600">
              {summary?.churnRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Inactive 90+ days</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Loading chart...</p>
            </div>
          ) : registrationTrend && registrationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="New Users"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">No registration data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Segmentation and Activity Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* User Segmentation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Segmentation</CardTitle>
            <p className="text-sm text-gray-600">By spending and order count</p>
          </CardHeader>
          <CardContent>
            {analytics.isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : segmentation ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={segmentation}
                    dataKey="users"
                    nameKey="segment"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.segment}: ${entry.users}`}
                    labelLine={false}
                  >
                    {segmentation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">No segmentation data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Patterns Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Patterns</CardTitle>
            <p className="text-sm text-gray-600">
              Login frequency distribution
            </p>
          </CardHeader>
          <CardContent>
            {analytics.isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : activityPatterns ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pattern" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#3b82f6" name="Users" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">No activity data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <p className="text-sm text-gray-600">Highest lifetime value users</p>
        </CardHeader>
        <CardContent>
          {analytics.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : topCustomers && topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">
                      Rank
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">
                      Customer
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                      Orders
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                      Lifetime Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((customer, index) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <span className="font-bold text-gray-800">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {customer.orderCount}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-green-600">
                        ${(customer.lifetimeValue / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">No customer data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Churn Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Analysis</CardTitle>
          <p className="text-sm text-gray-600">Users at risk and churned</p>
        </CardHeader>
        <CardContent>
          {analytics.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : churnAnalysis ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-gray-600">At Risk</div>
                <div className="text-2xl md:text-3xl font-bold text-yellow-600 mt-2">
                  {churnAnalysis.atRisk}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  30-60 days since last login
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-gray-600">Churned</div>
                <div className="text-2xl md:text-3xl font-bold text-red-600 mt-2">
                  {churnAnalysis.churned}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  90+ days since last login
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">No churn data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
