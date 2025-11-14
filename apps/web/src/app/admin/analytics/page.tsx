// 'use client'

// import Link from 'next/link'
// import { Route } from 'next'
// import {
//   Button,
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@repo/ui'
// import { RefreshCw } from 'lucide-react'
// import { KPIGrid } from './components/KPIGrid'
// import { UserGrowthChart } from './components/UserGrowthChart'
// import { ChurnRiskList } from './components/ChurnRiskList'
// import { useAnalytics, DATE_RANGES } from './AnalyticsContext'
// import { api } from '@/utils/api'

// /**
//  * Analytics Dashboard Page - Client Component
//  *
//  * Displays comprehensive analytics for admin decision-making.
//  * This dashboard focuses on USER BEHAVIOR and REVENUE METRICS.
//  *
//  * ROUTE: /admin/analytics
//  *
//  * FEATURES:
//  * - KPI cards (Total Users, Active Users, Churn Rate, etc.)
//  * - User growth chart (trends over time)
//  * - Churn risk list (users at risk of leaving)
//  * - Date range selector (shared with Order Analytics)
//  * - Navigation to Order Analytics dashboard
//  *
//  * PERFORMANCE:
//  * - Client-side data fetching with React Query
//  * - Cached results (5-minute TTL)
//  * - Shared date range state via AnalyticsContext
//  */

// export default function AnalyticsPage() {
//   // Get shared analytics state from context
//   // Note: startDate and endDate are not used yet because the endpoint doesn't support filtering
//   const { dateRange, setDateRange, period, setPeriod } = useAnalytics()

//   // Fetch analytics data
//   // Note: This endpoint doesn't support date range filtering yet.
//   // The date range selector is for future implementation.
//   const {
//     data: analytics,
//     isLoading,
//     refetch,
//     isFetching,
//     error,
//   } = api.admin.dashboard.getAnalyticsDashboard.useQuery(undefined, {
//     staleTime: 1000 * 60 * 5, // 5 minutes
//     retry: 1,
//   })

//   if (isLoading) {
//     return <AnalyticsLoadingSkeleton />
//   }

//   if (error) {
//     return (
//       <div className="flex h-[50vh] items-center justify-center">
//         <div className="text-center">
//           <p className="font-medium text-red-500">Error loading analytics</p>
//           <p className="mt-2 text-sm text-gray-500">{error.message}</p>
//         </div>
//       </div>
//     )
//   }

//   if (!analytics) {
//     return (
//       <div className="flex h-[50vh] items-center justify-center">
//         <p className="text-gray-500">No data available</p>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-6 p-4 sm:p-6">
//       {/* Header - Mobile Optimized */}
//       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold sm:text-3xl">
//             Analytics Dashboard
//           </h1>
//           <p className="text-sm text-gray-500 sm:text-base">
//             Data-driven insights into user behavior and business metrics
//           </p>
//         </div>

//         <div className="flex flex-wrap items-center gap-2">
//           {/* Date Range Selector */}
//           <Select value={dateRange} onValueChange={setDateRange}>
//             <SelectTrigger className="w-[140px] sm:w-[160px]">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {Object.entries(DATE_RANGES).map(([key, config]) => (
//                 <SelectItem key={key} value={key}>
//                   {config.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           {/* Period Selector */}
//           <Select value={period} onValueChange={setPeriod}>
//             <SelectTrigger className="w-[100px] sm:w-[120px]">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="daily">Daily</SelectItem>
//               <SelectItem value="weekly">Weekly</SelectItem>
//               <SelectItem value="monthly">Monthly</SelectItem>
//             </SelectContent>
//           </Select>

//           {/* Refresh Button */}
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => refetch()}
//             disabled={isFetching}
//           >
//             <RefreshCw
//               className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
//             />
//           </Button>
//         </div>
//       </div>

//       {/* Analytics Navigation Tabs */}
//       <div className="border-b border-gray-200">
//         <nav className="-mb-px flex space-x-8">
//           <Link
//             href="/admin/analytics/orders"
//             className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
//           >
//             Order Analytics
//           </Link>
//           <Link
//             href={'/admin/analytics' as Route}
//             className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
//           >
//             User & Revenue Analytics
//           </Link>
//         </nav>
//       </div>

//       {/* KEY PERFORMANCE INDICATORS */}
//       <div className="mb-8">
//         <KPIGrid kpis={analytics.kpis} />
//       </div>

//       {/* USER GROWTH CHART */}
//       <div className="mb-8">
//         <UserGrowthChart growthData={analytics.userGrowth} />
//       </div>

//       {/* CHURN RISK LIST */}
//       <div className="mb-8">
//         <ChurnRiskList users={analytics.churnRisk} />
//       </div>

//       {/* GENERATED TIMESTAMP */}
//       <div className="text-center text-sm text-gray-500">
//         Data generated at {analytics.generatedAt.toLocaleTimeString()}
//       </div>
//     </div>
//   )
// }

// // Loading skeleton component
// function AnalyticsLoadingSkeleton() {
//   return (
//     <div className="space-y-6 p-4 sm:p-6">
//       <div className="h-16 animate-pulse rounded-lg bg-gray-200 sm:h-20" />
//       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
//         {[...Array(6)].map((_, i) => (
//           <div
//             key={i}
//             className="h-28 animate-pulse rounded-lg bg-gray-200 sm:h-32"
//           />
//         ))}
//       </div>
//       <div className="h-[400px] animate-pulse rounded-lg bg-gray-200" />
//       <div className="h-[400px] animate-pulse rounded-lg bg-gray-200" />
//     </div>
//   )
// }

'use client'

import Link from 'next/link'
import { Route } from 'next'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { RefreshCw } from 'lucide-react'
import { KPIGrid } from './components/KPIGrid'
import { UserGrowthChart } from './components/UserGrowthChart'
import { ChurnRiskList } from './components/ChurnRiskList'
import { useAnalytics, DATE_RANGES } from './AnalyticsContext'
import { api } from '@/utils/api'

/**
 * Analytics Dashboard Page - Client Component
 *
 * Displays comprehensive analytics for admin decision-making.
 * This dashboard focuses on USER BEHAVIOR and REVENUE METRICS.
 *
 * ROUTE: /admin/analytics
 *
 * FEATURES:
 * - KPI cards (Total Users, Active Users, Churn Rate, etc.)
 * - User growth chart (trends over time)
 * - Churn risk list (users at risk of leaving)
 * - Date range selector (shared with Order Analytics via context)
 * - Period selector (shared with Order Analytics via context)
 * - Navigation to Order Analytics dashboard
 *
 * CONTEXT INTEGRATION:
 * - Uses shared AnalyticsContext for date range and period state
 * - Selections persist when navigating to/from Order Analytics
 *
 * NOTE: The backend endpoint doesn't currently support date filtering,
 * so the date range selector is shown for UI consistency but doesn't
 * affect the data. To implement filtering, update the backend endpoint
 * to accept startDate, endDate, and period parameters.
 */

export default function AnalyticsPage() {
  // Get shared analytics state from context
  // Note: startDate and endDate are not used yet because the endpoint doesn't support filtering
  const { dateRange, setDateRange, period, setPeriod } = useAnalytics()

  // Fetch analytics data
  // Note: This endpoint doesn't support date range filtering yet.
  // The date range selector is for future implementation and UI consistency.
  const {
    data: analytics,
    isLoading,
    refetch,
    isFetching,
    error,
  } = api.admin.dashboard.getAnalyticsDashboard.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  if (isLoading) {
    return <AnalyticsLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="font-medium text-red-500">Error loading analytics</p>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
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
      {/* Header with date range selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Data-driven insights into user behavior and business metrics
          </p>
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

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/admin/analytics/orders"
            className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            Order Analytics
          </Link>
          <Link
            href={'/admin/analytics' as Route}
            className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
          >
            User & Revenue Analytics
          </Link>
        </nav>
      </div>

      {/* Analytics Components */}
      <div className="mb-8">
        <KPIGrid kpis={analytics.kpis} />
      </div>

      <div className="mb-8">
        <UserGrowthChart growthData={analytics.userGrowth} />
      </div>

      <div className="mb-8">
        <ChurnRiskList users={analytics.churnRisk} />
      </div>

      <div className="text-center text-sm text-gray-500">
        Data generated at {analytics.generatedAt.toLocaleTimeString()}
      </div>
    </div>
  )
}

// Loading skeleton component
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="h-16 animate-pulse rounded-lg bg-gray-200 sm:h-20" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-gray-200 sm:h-32"
          />
        ))}
      </div>
      <div className="h-[400px] animate-pulse rounded-lg bg-gray-200" />
      <div className="h-[400px] animate-pulse rounded-lg bg-gray-200" />
    </div>
  )
}
