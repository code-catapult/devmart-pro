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
} from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'
import { formatDistance } from 'date-fns'
import { OrderStatus } from '@repo/shared/types'
import { StatusUpdateDialog } from '~/components/admin/orders/StatusUpdateDialog'

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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrderStatus, setSelectedOrderStatus] =
    useState<OrderStatus | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  const { data, isLoading } = api.admin.dashboard.getRecentOrders.useQuery({
    limit: 10,
    page,
  })

  const handleStatusClick = (orderId: string, currentStatus: OrderStatus) => {
    setSelectedOrderId(orderId)
    setSelectedOrderStatus(currentStatus)
    setShowStatusDialog(true)
  }

  const handleDialogClose = () => {
    setShowStatusDialog(false)
    setSelectedOrderId(null)
    setSelectedOrderStatus(null)
  }

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusClick(order.id, order.status)}
                  >
                    Update Status
                  </Button>
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

      {/* Status Update Dialog */}
      {selectedOrderId && selectedOrderStatus && (
        <StatusUpdateDialog
          orderId={selectedOrderId}
          currentStatus={selectedOrderStatus}
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          onSuccess={handleDialogClose}
        />
      )}
    </Card>
  )
}
