'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'

/**
 * Analytics Context
 *
 * Provides shared state for date range and period selections across all analytics dashboards.
 * This ensures consistent filtering across User/Revenue and Order analytics pages.
 *
 * USAGE:
 * - Wrap analytics pages with <AnalyticsProvider>
 * - Access state via useAnalytics() hook
 * - Date range is automatically calculated from the selected range key
 */

// Date range options
export const DATE_RANGES = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  all: { label: 'All Time', days: null },
} as const

export type DateRangeKey = keyof typeof DATE_RANGES
export type Period = 'daily' | 'weekly' | 'monthly'

interface AnalyticsContextType {
  // Date range selection
  dateRange: DateRangeKey
  setDateRange: (range: DateRangeKey) => void

  // Period selection
  period: Period
  setPeriod: (period: Period) => void

  // Computed date values (memoized to prevent infinite loops)
  startDate: Date | undefined
  endDate: Date | undefined
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [dateRange, setDateRange] = useState<DateRangeKey>('30d')
  const [period, setPeriod] = useState<Period>('daily')

  // Calculate date range with useMemo to prevent infinite re-renders
  const { startDate, endDate } = useMemo(() => {
    const config = DATE_RANGES[dateRange]
    if (!config.days) return { startDate: undefined, endDate: undefined }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - config.days)

    return { startDate, endDate }
  }, [dateRange])

  return (
    <AnalyticsContext.Provider
      value={{
        dateRange,
        setDateRange,
        period,
        setPeriod,
        startDate,
        endDate,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to access analytics context
 *
 * @throws Error if used outside of AnalyticsProvider
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }
  return context
}
