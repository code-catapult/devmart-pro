import { Suspense } from 'react'
import { MetricsCards } from '~/components/admin/metrics-cards'
import { RecentOrdersList } from '~/components/admin/recent-orders-list'
import { SalesChart } from '~/components/admin/sales-chart'
import { InventoryAlerts } from '~/components/admin/inventory-alerts'
import { QuickActions } from '~/components/admin/quick-actions'
import { Skeleton } from '@repo/ui'

/**
 * Admin Dashboard Page
 *
 * Main admin overview with KPIs, charts, and quick actions.
 * Uses Suspense boundaries for progressive loading.
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here&apos;s what&apos;s happening with your store.
        </p>
      </div>

      {/* Quick Actions */}
      <Suspense fallback={<QuickActionsSkeleton />}>
        <QuickActions />
      </Suspense>

      {/* Metrics Cards (KPIs) */}
      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards />
      </Suspense>

      {/* Sales Analytics Chart */}
      <Suspense fallback={<SalesChartSkeleton />}>
        <SalesChart />
      </Suspense>

      {/* Two-Column Layout: Orders + Inventory */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Orders */}
        <Suspense fallback={<RecentOrdersSkeleton />}>
          <RecentOrdersList />
        </Suspense>

        {/* Low Inventory Alerts */}
        <Suspense fallback={<InventoryAlertsSkeleton />}>
          <InventoryAlerts />
        </Suspense>
      </div>
    </div>
  )
}

// Loading Skeletons for Suspense Boundaries

function QuickActionsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

function MetricsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

function SalesChartSkeleton() {
  return <Skeleton className="h-96" />
}

function RecentOrdersSkeleton() {
  return <Skeleton className="h-96" />
}

function InventoryAlertsSkeleton() {
  return <Skeleton className="h-96" />
}
