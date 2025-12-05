'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { UserGrowthData } from '../types'

/**
 * UserGrowthChart Component
 *
 * Displays user growth trends over time.
 *
 * FEATURES:
 * - Switchable time periods (daily, weekly, monthly)
 * - Responsive chart sizing
 * - Touch-friendly tooltips
 * - Mobile-optimized labels
 *
 * CHART LIBRARY: Recharts
 * - React-friendly
 * - Responsive by default
 * - Touch-compatible
 */

interface UserGrowthChartProps {
  growthData: UserGrowthData
}

type TimePeriod = 'daily' | 'weekly' | 'monthly'

export function UserGrowthChart({ growthData }: UserGrowthChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('daily')

  // Get data for selected period
  const data = growthData[selectedPeriod]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* ============================================ */}
      {/* HEADER WITH PERIOD SELECTOR */}
      {/* ============================================ */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            User Growth Trend
          </h2>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`
                rounded-lg px-4 py-2
                text-sm font-medium
                transition-colors
                min-h-[44px]
                ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* CHART */}
      {/* ============================================ */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#9ca3af"
            angle={-45}
            textAnchor="end"
            height={80}
          />

          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />

          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* ============================================ */}
      {/* SUMMARY STATS */}
      {/* ============================================ */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-600">Total Growth</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            +{data.reduce((sum, point) => sum + point.value, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Average</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {Math.round(
              data.reduce((sum, point) => sum + point.value, 0) / data.length
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Peak Day</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {Math.max(...data.map((p) => p.value))}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Trend</p>
          <p className="mt-1 text-lg font-semibold text-green-600">
            {data[data.length - 1]?.value > data[0]?.value
              ? '↗ Growing'
              : '↘ Declining'}
          </p>
        </div>
      </div>
    </div>
  )
}
