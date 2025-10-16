'use client'

import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react'
import { api } from '~/utils/api'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'

/**
 * MetricsCards Component
 *
 * Displays 4 KPI cards: Total Sales, Orders, Products, Users
 * Fetches data from admin.getDashboardMetrics tRPC endpoint
 *
 * Uses @repo/ui components (Card, Skeleton) and @repo/shared utilities (formatPrice)
 * demonstrating the value of Story 3.0's monorepo refactoring.
 */
export function MetricsCards() {
  const {
    data: metrics,
    isLoading,
    error,
  } = api.admin.getDashboardMetrics.useQuery()

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Failed to load metrics: {error.message}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return <MetricsCardsSkeleton />
  }

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPrice(metrics?.totalSales ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From delivered orders
          </p>
        </CardContent>
      </Card>

      {/* Total Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics?.totalOrders ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All order statuses
          </p>
        </CardContent>
      </Card>

      {/* Active Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics?.totalProducts ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">In catalog</p>
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics?.totalUsers ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered accounts
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Skeleton for loading state
function MetricsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
