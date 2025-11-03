'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '~/utils/api'
import { formatCurrency, formatDate } from '@repo/shared/utils'
import { OrderStatus } from '@repo/shared/types'
import {
  Badge,
  Button,
  Checkbox,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@repo/ui'

import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  Download,
  PackageCheck,
  XCircle,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { Route } from 'next'
import Link from 'next/link'

// Status badge variants
const STATUS_VARIANTS: Record<
  OrderStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'outline',
  PROCESSING: 'secondary',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
}

export default function OrdersPage() {
  const router = useRouter()
  const utils = api.useUtils()

  // Table state
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [status, setStatus] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'orderNumber' | 'createdAt' | 'total'>(
    'createdAt'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // Status update dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [newStatus, setNewStatus] = useState<OrderStatus>('PENDING')
  const [statusNotes, setStatusNotes] = useState('')

  // Fetch orders with filters
  const {
    data: ordersData,
    isLoading,
    error,
  } = api.admin.orders.getOrders.useQuery({
    page,
    limit,
    status: status === 'ALL' ? undefined : (status as OrderStatus),
    search: search || undefined,
    sortBy,
    sortOrder,
  })

  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination

  // Mutations
  const updateStatusMutation = api.admin.orders.updateOrderStatus.useMutation({
    onSuccess: () => {
      void utils.admin.orders.getOrders.invalidate()
      void utils.admin.dashboard.getDashboardMetrics.invalidate()
    },
  })

  const bulkUpdateMutation = api.admin.orders.bulkUpdateOrderStatus.useMutation(
    {
      onSuccess: () => {
        void utils.admin.orders.getOrders.invalidate()
        void utils.admin.dashboard.getDashboardMetrics.invalidate()
        setSelectedOrders([])
      },
    }
  )

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map((o) => o.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId))
    }
  }

  const handleBulkAction = async (
    newStatus: 'PROCESSING' | 'SHIPPED' | 'CANCELLED'
  ) => {
    if (selectedOrders.length === 0) return

    try {
      await bulkUpdateMutation.mutateAsync({
        orderIds: selectedOrders,
        status: newStatus,
      })
    } catch (err) {
      console.error('Bulk update failed:', err)
      alert('Failed to update orders. Check console for details.')
    }
  }

  const handleOpenStatusDialog = (
    orderId: string,
    currentStatus: OrderStatus
  ) => {
    setSelectedOrderId(orderId)
    setNewStatus(currentStatus)
    setStatusNotes('')
    setIsStatusDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrderId) return

    try {
      await updateStatusMutation.mutateAsync({
        orderId: selectedOrderId,
        status: newStatus,
        notes: statusNotes || undefined,
      })
      setIsStatusDialogOpen(false)
      setStatusNotes('')
    } catch (err) {
      console.error('Status update failed:', err)
      alert('Failed to update order status. Check console for details.')
    }
  }

  const handleExport = () => {
    // Build query params for export
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)

    // Open export URL in new window
    window.open(`/api/admin/orders/export?${params.toString()}`, '_blank')
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to desc
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm text-red-600">Failed to load orders</p>
          <p className="text-xs text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-2 mb-6 md:hidden md:flex-row md:items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">back to dashboard</span>
          </Link>
        </Button>
      </div>
      {/* Page Header */}
      <div className="mb-8 text-muted-foreground">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500">
          Manage customer orders, update status, and process refunds
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left side: Filters */}
        <div className="flex flex-1 gap-2">
          {/* Search */}
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />

          {/* Status Filter */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] text-gray-400">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right side: Actions */}
        <div className="flex gap-2">
          {/* Bulk Actions */}
          {selectedOrders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ChevronDown />
                  Bulk Actions ({selectedOrders.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => handleBulkAction('PROCESSING')}
                >
                  Mark as Processing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('SHIPPED')}>
                  Mark as Shipped
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('CANCELLED')}>
                  Cancel Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export Button */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Data Table - Desktop View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    selectedOrders.length === orders.length && orders.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('orderNumber')}
              >
                Order #
                {sortBy === 'orderNumber' &&
                  (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('total')}
              >
                Total
                {sortBy === 'total' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('createdAt')}
              >
                Date
                {sortBy === 'createdAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="text-gray-500 hover:text-gray-100"
                >
                  {/* Checkbox */}
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOrder(order.id, checked as boolean)
                      }
                    />
                  </TableCell>

                  {/* Order Number */}
                  <TableCell className="font-medium text-blue-400 hover:underline">
                    <Link href={`/admin/orders/${order.id}` as Route}>
                      {order.orderNumber}
                    </Link>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {order.user.name || 'Guest'}
                      </span>
                      <span className="text-xs">{order.user.email}</span>
                    </div>
                  </TableCell>

                  {/* Items Count */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PackageCheck className="h-4 w-4" />
                      <span>{order.orderItems.length}</span>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>

                  {/* Total */}
                  <TableCell className="font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm">
                    {formatDate(order.createdAt)}
                  </TableCell>

                  {/* Actions Menu */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/orders/${order.id}` as Route)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleOpenStatusDialog(order.id, order.status)
                          }
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Update Status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-lg p-4 space-y-3 shadow-sm"
              onClick={() => router.push(`/admin/orders/${order.id}` as Route)}
            >
              {/* Header: Order Number + Checkbox */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => {
                      handleSelectOrder(order.id, checked as boolean)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-semibold text-base">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANTS[order.status]}>
                  {order.status}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="flex items-start gap-2 text-sm">
                <div className="flex-1">
                  <p className="font-medium text-gray-700">
                    {order.user.name || 'Guest'}
                  </p>
                  <p className="text-xs text-gray-500">{order.user.email}</p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <PackageCheck className="h-4 w-4" />
                    <span>{order.orderItems.length} items</span>
                  </div>
                </div>
                <p className="font-bold text-lg">
                  {formatCurrency(order.total)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/admin/orders/${order.id}` as Route)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenStatusDialog(order.id, order.status)
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 text-center sm:text-left">
            Showing {(page - 1) * limit + 1}-
            {Math.min(page * limit, pagination.total)} of {pagination.total}{' '}
            orders
          </p>

          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>

            {/* Page Numbers - Hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:flex gap-2">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const pageNumber = i + 1
                  return (
                    <Button
                      key={pageNumber}
                      variant={page === pageNumber ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  )
                }
              )}

              {pagination.totalPages > 5 && (
                <>
                  <span className="px-2 py-1 text-sm text-gray-500">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(pagination.totalPages)}
                  >
                    {pagination.totalPages}
                  </Button>
                </>
              )}
            </div>

            {/* Page indicator on mobile */}
            <div className="sm:hidden px-3 py-1 text-sm text-gray-600">
              Page {page} of {pagination.totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order{' '}
              {orders.find((o) => o.id === selectedOrderId)?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Status Select */}
            <div className="grid gap-2">
              <Label htmlFor="status">New Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as OrderStatus)}
              >
                <SelectTrigger id="status">
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

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
