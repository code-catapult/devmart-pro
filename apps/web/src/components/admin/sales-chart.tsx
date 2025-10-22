'use client'

import { useState } from 'react'
import { api } from '~/utils/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type SalesAnalyticsPeriod = 'daily' | 'weekly' | 'monthly'

export function SalesChart() {
  const [period, setPeriod] = useState<SalesAnalyticsPeriod>('daily')
  const { data: analytics, isLoading } =
    api.admin.dashboard.getSalesAnalytics.useQuery({
      period,
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sales Analytics</CardTitle>
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as SalesAnalyticsPeriod)}
          >
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 bg-gray-100 animate-pulse rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date)
                  return d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }}
              />
              <YAxis tickFormatter={(value) => formatPrice(value)} />
              <Tooltip
                formatter={(value: number) => formatPrice(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
