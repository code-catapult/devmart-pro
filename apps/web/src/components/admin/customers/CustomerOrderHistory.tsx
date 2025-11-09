'use client'

import { useState } from 'react'
import { api } from '~/utils/api'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'

import { ShoppingCart, Eye, TrendingUp, Package } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@repo/shared/utils'
import { OrderStatus } from '@prisma/client'

interface CustomerOrderHistoryProps {
  customerId: string
  // Optional: limit display for embedded context
  maxOrders?: number
  // Optional: show header and filters
  showHeader?: boolean
}

export function CustomerOrderHistory({
  customerId,
  maxOrders,
  showHeader = true,
}: CustomerOrderHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const limit = maxOrders || 10

  // Fetch customer's orders
  const { data, isLoading, error } = api.admin.customers.getOrders.useQuery({
    userId: customerId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit,
  })

  // Fetch customer summary stats
  const { data: stats } = api.admin.customers.getOrderStats.useQuery({
    customerId,
  })

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return 'default'
      case 'SHIPPED':
        return 'secondary'
      case 'PROCESSING':
        return 'outline'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-red-600">
            Failed to load order history: {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats Cards - Mobile Optimized */}
      {showHeader && stats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {stats.totalOrders}
              </div>
              <p className="text-xs text-gray-500">
                {stats.completedOrders} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                Lifetime Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold truncate">
                {formatCurrency(stats.totalSpent)}
              </div>
              <p className="text-xs text-gray-500 truncate">
                Avg: {formatCurrency(stats.averageOrderValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                Pending Orders
              </CardTitle>
              <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {stats.pendingOrders}
              </div>
              <p className="text-xs text-gray-500">Require attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order History Table - Mobile Optimized */}
      <Card>
        {showHeader && (
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base sm:text-lg">
                Order History
              </CardTitle>
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as OrderStatus | 'ALL')
                  setPage(1) // Reset to first page when filtering
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Orders</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        )}
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : !data || data.orders.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-gray-500">
                {statusFilter === 'ALL'
                  ? 'No orders found for this customer'
                  : `No ${statusFilter.toLowerCase()} orders`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.orderItems.length} item
                            {order.orderItems.length !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View - Visible on Mobile Only */}
              <div className="md:hidden space-y-3">
                {data.orders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-gray-500 truncate">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">
                          {order.orderItems.length} item
                          {order.orderItems.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination - Mobile Optimized */}
              {!maxOrders && data.pagination.totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    Showing {(page - 1) * limit + 1}-
                    {Math.min(page * limit, data.pagination.total)} of{' '}
                    {data.pagination.total}
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex-1 sm:flex-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(data.pagination.totalPages, p + 1)
                        )
                      }
                      disabled={page === data.pagination.totalPages}
                      className="flex-1 sm:flex-none"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
