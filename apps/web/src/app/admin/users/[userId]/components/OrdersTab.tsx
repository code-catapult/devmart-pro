'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Filter } from 'lucide-react'
import type { OrderSummary } from '@repo/shared/types'
import { formatCurrency } from '@repo/shared/utils'

/**
 * OrdersTab Component
 *
 * Displays full order history with filtering by status.
 *
 * FEATURES:
 * - Filter by order status (ALL, PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 * - Sort by date (newest first)
 * - Real-time revenue calculation based on filters
 * - Order count by status shown in dropdown
 * - Status-based color coding (green/red/blue/yellow)
 *
 * MOBILE OPTIMIZATIONS:
 * - Filter label and select stack vertically
 * - Time hidden on mobile (date only)
 * - Order cards stack with horizontal price/status row
 * - Reduced padding and spacing
 * - Smaller empty state height
 * - Text truncation on order numbers
 */

interface OrdersTabProps {
  userId: string
  initialOrders: OrderSummary[]
}

type OrderStatus =
  | 'ALL'
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export function OrdersTab({ initialOrders }: OrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('ALL')

  // ============================================
  // FILTER ORDERS
  // ============================================

  const filteredOrders =
    statusFilter === 'ALL'
      ? initialOrders
      : initialOrders.filter((order) => order.status === statusFilter)

  // ============================================
  // CALCULATE STATS
  // ============================================

  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + order.total,
    0
  )
  const statusCounts = {
    ALL: initialOrders.length,
    PENDING: initialOrders.filter((o) => o.status === 'PENDING').length,
    PROCESSING: initialOrders.filter((o) => o.status === 'PROCESSING').length,
    SHIPPED: initialOrders.filter((o) => o.status === 'SHIPPED').length,
    DELIVERED: initialOrders.filter((o) => o.status === 'DELIVERED').length,
    CANCELLED: initialOrders.filter((o) => o.status === 'CANCELLED').length,
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ============================================ */}
      {/* FILTER BAR */}
      {/* ============================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
            <label
              htmlFor="status-filter"
              className="text-xs sm:text-sm font-medium text-gray-700"
            >
              Filter by status:
            </label>
          </div>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
            className="
              rounded-lg border border-gray-300 bg-white
              px-3 py-2.5
              text-sm text-gray-900
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
              min-h-[44px]
            "
          >
            <option value="ALL">All ({statusCounts.ALL})</option>
            <option value="PENDING">Pending ({statusCounts.PENDING})</option>
            <option value="PROCESSING">
              Processing ({statusCounts.PROCESSING})
            </option>
            <option value="SHIPPED">Shipped ({statusCounts.SHIPPED})</option>
            <option value="DELIVERED">
              Delivered ({statusCounts.DELIVERED})
            </option>
            <option value="CANCELLED">
              Cancelled ({statusCounts.CANCELLED})
            </option>
          </select>
        </div>

        <div className="text-xs sm:text-sm text-gray-600 px-1">
          Total Revenue:{' '}
          <span className="font-semibold text-gray-900">
            {formatCurrency(totalRevenue)}
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* ORDERS LIST */}
      {/* ============================================ */}
      {filteredOrders.length === 0 ? (
        <div className="flex min-h-[150px] sm:min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-600 px-4 text-center">
            {statusFilter === 'ALL'
              ? 'No orders yet'
              : `No ${statusFilter.toLowerCase()} orders`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-2 sm:gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  Order #{order.orderNumber}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  <span className="inline-block">{order.itemCount} items</span>
                  <span className="mx-1.5">•</span>
                  <span className="inline-block">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="hidden sm:inline">
                    {' at '}
                    {format(new Date(order.createdAt), 'h:mm a')}
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                <div className="text-left sm:text-right">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {formatCurrency(order.total)}
                  </p>
                </div>

                <span
                  className={`
                    inline-flex rounded-full px-2.5 py-1 sm:px-3
                    text-xs font-semibold shrink-0
                    min-w-[90px] sm:min-w-[100px] justify-center
                    ${
                      order.status === 'DELIVERED'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : order.status === 'SHIPPED'
                            ? 'bg-blue-100 text-blue-800'
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
    </div>
  )
}
