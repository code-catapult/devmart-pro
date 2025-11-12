'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import type {
  OrderSummary,
  ActivityLogEntry,
  SupportNoteItem,
} from '@repo/shared/types'
import { formatCurrency } from '@repo/shared/utils'

/**
 * OverviewTab Component
 *
 * Displays summary highlights from all data sources:
 * - Recent orders (last 3) with status badges and totals
 * - Recent activity (last 5) in timeline format
 * - Recent notes (last 3) with admin attribution
 *
 * MOBILE OPTIMIZATIONS:
 * - Reduced spacing between sections
 * - Order cards stack vertically with inline price/status
 * - Smaller headings and icons
 * - Text wrapping for long content
 * - Reduced padding throughout
 *
 * This provides a "dashboard view" without overwhelming
 * the admin with full data lists.
 */

interface OverviewTabProps {
  userId: string
  initialData: {
    orders: OrderSummary[]
    activity: ActivityLogEntry[]
    notes: SupportNoteItem[]
  }
}

export function OverviewTab({ initialData }: OverviewTabProps) {
  const recentOrders = initialData.orders.slice(0, 3)
  const recentActivity = initialData.activity.slice(0, 5)
  const recentNotes = initialData.notes.slice(0, 3)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================ */}
      {/* RECENT ORDERS */}
      {/* ============================================ */}
      <div>
        <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
          Recent Orders
        </h3>
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No orders yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    Order #{order.orderNumber}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    {order.itemCount} items •{' '}
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {formatCurrency(order.total)}
                  </p>
                  <span
                    className={`
                      inline-flex rounded-full px-2.5 py-0.5 sm:px-2 sm:py-0.5
                      text-xs font-medium shrink-0
                      ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }
                    `}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {initialData.orders.length > 3 && (
          <p className="mt-3 text-xs sm:text-sm text-gray-600">
            +{initialData.orders.length - 3} more orders (see Orders tab)
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* RECENT ACTIVITY */}
      {/* ============================================ */}
      <div>
        <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No activity yet</p>
        ) : (
          <div className="mt-4 space-y-2.5 sm:space-y-2">
            {recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 sm:gap-3 text-sm"
              >
                <div className="mt-1 sm:mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 break-words">{log.action}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {initialData.activity.length > 5 && (
          <p className="mt-3 text-xs sm:text-sm text-gray-600">
            +{initialData.activity.length - 5} more events (see Activity tab)
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* RECENT SUPPORT NOTES */}
      {/* ============================================ */}
      <div>
        <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
          Recent Support Notes
        </h3>
        {recentNotes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No support notes yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4"
              >
                <p className="text-sm text-gray-900 break-words">
                  {note.content}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  By {note.adminName} •{' '}
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
        {initialData.notes.length > 3 && (
          <p className="mt-3 text-xs sm:text-sm text-gray-600">
            +{initialData.notes.length - 3} more notes (see Notes tab)
          </p>
        )}
      </div>
    </div>
  )
}
