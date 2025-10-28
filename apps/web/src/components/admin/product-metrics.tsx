'use client'

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { api } from '~/utils/api'
import { Skeleton } from '@repo/ui'

/**
 * ProductMetrics Component
 *
 * Displays performance analytics for a single product.
 *
 * Features:
 * - Revenue, units sold, order count
 * - Average order value
 * - Inventory turnover ratio
 * - Visual indicators (icons, colors)
 * - Loading states
 * - Error handling
 *
 * @param productId - Product to show metrics for
 */

interface ProductMetricsProps {
  productId: string
}

export function ProductMetrics({ productId }: ProductMetricsProps) {
  const {
    data: metrics,
    isLoading,
    error,
  } = api.admin.products.getMetrics.useQuery({
    id: productId,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Failed to load metrics: {error.message}
        </p>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  // Determine inventory turnover health
  const getTurnoverStatus = (turnover: number) => {
    if (turnover === 0) return { label: 'Not Sold', color: 'text-gray-500' }
    if (turnover > 5) return { label: 'Fast Moving', color: 'text-green-600' }
    if (turnover > 2) return { label: 'Moderate', color: 'text-blue-600' }
    return { label: 'Slow Moving', color: 'text-yellow-600' }
  }

  const turnoverStatus = getTurnoverStatus(metrics.inventoryTurnover)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <p className="text-sm text-gray-500">
          Analytics based on completed orders (DELIVERED status)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime revenue from this product
            </p>
          </CardContent>
        </Card>

        {/* Units Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unitsSold}</div>
            <p className="text-xs text-muted-foreground">
              Total quantity sold across all orders
            </p>
          </CardContent>
        </Card>

        {/* Order Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.orderCount}</div>
            <p className="text-xs text-muted-foreground">
              Number of completed orders
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Order Value
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue per order</p>
          </CardContent>
        </Card>

        {/* Inventory Turnover */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Turnover
            </CardTitle>
            {metrics.inventoryTurnover > 2 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.inventoryTurnover.toFixed(1)}x
            </div>
            <p className={`text-xs font-medium ${turnoverStatus.color}`}>
              {turnoverStatus.label}
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate (Placeholder) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">N/A</div>
            <p className="text-xs text-muted-foreground">
              Requires view tracking (future feature)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      {metrics.unitsSold > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {metrics.inventoryTurnover > 5 && (
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>High demand product - consider increasing inventory</span>
              </div>
            )}
            {metrics.inventoryTurnover < 1 && metrics.inventoryTurnover > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <TrendingDown className="h-4 w-4" />
                <span>
                  Slow moving product - consider reducing stock or promotion
                </span>
              </div>
            )}
            {metrics.averageOrderValue > 10000 && (
              <div className="flex items-center gap-2 text-blue-600">
                <DollarSign className="h-4 w-4" />
                <span>
                  High-value product - focus on quality and customer service
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
