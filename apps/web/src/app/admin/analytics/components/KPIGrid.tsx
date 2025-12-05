'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KPIMetric } from '../types'
import { formatCurrency } from '@repo/shared/utils'

/**
 * KPIGrid Component
 *
 * Displays key performance indicators in a responsive grid.
 *
 * FEATURES:
 * - Auto-formatting (currency, percentage, number)
 * - Trend indicators (up/down/neutral arrows)
 * - Color-coded changes (green=good, red=bad)
 * - Responsive grid (1-col mobile, 3-col desktop)
 */

interface KPIGridProps {
  kpis: Record<string, KPIMetric>
}

export function KPIGrid({ kpis }: KPIGridProps) {
  /**
   * Format value based on metric type.
   */
  const formatValue = (
    value: number | string,
    format: KPIMetric['format']
  ): string => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      default:
        return String(value)
    }
  }

  /**
   * Get trend icon based on direction.
   */
  const getTrendIcon = (trend: KPIMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case 'neutral':
        return <Minus className="h-5 w-5 text-gray-400" />
      default:
        return null
    }
  }

  /**
   * Get change color based on trend.
   */
  const getChangeColor = (trend: KPIMetric['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-700'
      case 'down':
        return 'text-red-700'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.values(kpis).map((kpi, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm"
        >
          {/* Label */}
          <p className="text-sm font-medium text-gray-600">{kpi.label}</p>

          {/* Value - Mobile Optimized */}
          <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {formatValue(kpi.value, kpi.format)}
          </p>

          {/* Change Indicator */}
          {kpi.change !== undefined && (
            <div className="mt-2 sm:mt-3 flex items-center gap-2">
              {getTrendIcon(kpi.trend)}
              <span
                className={`text-xs sm:text-sm font-medium ${getChangeColor(
                  kpi.trend
                )}`}
              >
                {kpi.change > 0 && '+'}
                {kpi.change.toFixed(1)}% from previous period
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
