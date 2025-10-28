'use client'

import { useState } from 'react'
import { api } from '~/utils/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'
import { formatDistance } from 'date-fns'
import { OrderStatus } from '@repo/shared/types'

/**
 * RecentOrdersList Component (Mobile-Responsive)
 *
 * Displays recent orders with status management.
 *
 * Mobile Features:
 * - Stacked layout for better readability
 * - Larger touch targets for status dropdown
 * - Full-width status selector on mobile
 * - Responsive pagination controls
 */

export function RecentOrdersList() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = api.admin.dashboard.getRecentOrders.useQuery({
    limit: 10,
    page,
  })
  const utils = api.useUtils()

  const updateStatusMutation =
    api.admin.dashboard.updateOrderStatus.useMutation({
      onSuccess: () => {
        // Invalidate and refetch orders
        utils.admin.dashboard.getRecentOrders.invalidate()
        utils.admin.dashboard.getDashboardMetrics.invalidate()
      },
    })

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {data?.orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:justify-between border-b pb-4"
              >
                <div className="flex-1 mb-6">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  <div className="flex items-center gap-2 mt-1 mb-1">
                    <span className="font-medium">{order.orderNumber}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.user.name || order.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(new Date(order.createdAt), new Date(), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="font-semibold">
                    {formatPrice(order.total)}
                  </span>
                  <Select
                    value={order.status}
                    onValueChange={(status: OrderStatus) => {
                      updateStatusMutation.mutate({
                        orderId: order.id,
                        status: status,
                      })
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.pagination.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
