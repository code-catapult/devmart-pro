'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '~/utils/api'
import { formatCurrency, formatDateTime, formatDate } from '@repo/shared/utils'
import { OrderStatus, ShippingAddress } from '@repo/shared/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@repo/ui'

import {
  ArrowLeft,
  XCircle,
  RefreshCw,
  Package,
  CreditCard,
  User,
  Mail,
  Truck,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react'

import { StatusUpdateDialog } from '~/components/admin/orders/StatusUpdateDialog'
import { RefundDialog } from '~/components/admin/orders/RefundDialog'

// Status badge variants (same as list page)
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  // State for dialogs
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)

  // Fetch order details
  const {
    data: order,
    isLoading,
    error,
  } = api.admin.orders.getOrderById.useQuery({
    id: orderId,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="text-sm text-gray-500">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold">Order Not Found</h2>
          <p className="mb-4 text-sm text-gray-500">
            {error?.message || 'Unable to load order details'}
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Status badge styling
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'default' // green
      case 'SHIPPED':
        return 'secondary' // blue
      case 'PROCESSING':
        return 'outline' // gray
      case 'CANCELLED':
        return 'destructive' // red
      default:
        return 'outline'
    }
  }

  // We cast to unknown first because shippingAddress was typed that way in the Order interface in packages/shared/src/types/order.ts
  const address = order.shippingAddress as unknown as ShippingAddress

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/orders')}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={getStatusBadgeVariant(order.status)}
            className="text-sm"
          >
            {order.status}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStatusDialog(true)}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Status
          </Button>
          {/* Refund Button - Only show if order has payment and isn't fully refunded */}
          {order.stripePaymentIntentId &&
            (order.refundAmount || 0) < order.total && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRefundDialog(true)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Process Refund
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="mt-1 h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-gray-600">
                  {order.user.name || 'Guest'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-1 h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-gray-600">{order.user.email}</p>
              </div>
            </div>
            {order.shippingAddress && (
              <div className="flex items-start gap-2">
                <Package className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Shipping Address</p>
                  <p className="text-sm text-gray-600">
                    {address.street}
                    <br />
                    {address.city}, {address.state} {address.zip}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order Number</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order Date</span>
              <span className="font-medium">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <Badge variant={STATUS_VARIANTS[order.status]}>
                {order.status}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items Ordered
          </CardTitle>
          <CardDescription>
            {order.orderItems.length} item
            {order.orderItems.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {item.product.images?.[0] && (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="h-12 w-12 flex-shrink-0 rounded-md object-cover sm:h-16 sm:w-16"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate sm:whitespace-normal">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      SKU: {item.product.sku}
                    </p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pl-15 sm:pl-0 sm:block sm:text-right sm:flex-shrink-0">
                  <span className="text-sm text-gray-500 sm:hidden">
                    Total:
                  </span>
                  <div>
                    <p className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            {/* Order Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>
                  {formatCurrency(
                    order.orderItems.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>
                  {formatCurrency(
                    order.total -
                      order.orderItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                      )
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Shipping Information */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Method</span>
              <span className="font-medium">Credit Card</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Status</span>
              <Badge variant="default">Paid</Badge>
            </div>
            {order.stripePaymentIntentId && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payment ID</span>
                <span className="font-mono text-xs">
                  {order.stripePaymentIntentId.substring(0, 20)}...
                </span>
              </div>
            )}
            {order.refundAmount && order.refundAmount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-red-600">
                  <span className="text-sm font-medium">Refunded</span>
                  <span className="font-medium">
                    {formatCurrency(order.refundAmount)}
                  </span>
                </div>
                {order.refundReason && (
                  <p className="text-sm text-gray-600">
                    Reason: {order.refundReason}
                  </p>
                )}
              </>
            )}
            {!order.refundAmount && order.status !== 'CANCELLED' && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowRefundDialog(true)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Process Refund
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.trackingNumber ? (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Carrier</span>
                  <span className="font-medium">{order.shippingCarrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tracking Number</span>
                  <span className="font-mono text-sm">
                    {order.trackingNumber}
                  </span>
                </div>
                {order.estimatedDelivery && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Estimated Delivery
                    </span>
                    <span className="font-medium">
                      {formatDate(order.estimatedDelivery)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Truck className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  No tracking information yet
                </p>
                {order.status === 'PROCESSING' && (
                  <Button variant="outline" size="sm" className="mt-3">
                    Add Tracking Info
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Timeline */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Order Timeline
          </CardTitle>
          <CardDescription>History of order status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline entries (simplified - in production, track actual status change history) */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div className="h-full w-px bg-gray-200" />
              </div>
              <div className="pb-8">
                <p className="font-medium">Order Placed</p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            </div>

            {order.status !== 'PENDING' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  {order.status !== 'PROCESSING' && (
                    <div className="h-full w-px bg-gray-200" />
                  )}
                </div>
                <div className="pb-8">
                  <p className="font-medium">Payment Confirmed</p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>
            )}

            {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Truck className="h-5 w-5 text-orange-600" />
                  </div>
                  {order.status !== 'SHIPPED' && (
                    <div className="h-full w-px bg-gray-200" />
                  )}
                </div>
                <div className="pb-8">
                  <p className="font-medium">Shipped</p>
                  <p className="text-sm text-gray-500">
                    {order.trackingNumber &&
                      `Tracking: ${order.trackingNumber}`}
                  </p>
                </div>
              </div>
            )}

            {order.status === 'DELIVERED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Delivered</p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            )}

            {order.status === 'CANCELLED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Cancelled</p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        orderId={orderId}
        currentStatus={order.status}
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        onSuccess={() => {
          // Dialog automatically refetches order data via tRPC cache invalidation
          console.log('Order status updated successfully')
        }}
      />

      {/* Refund Dialog */}
      <RefundDialog
        orderId={orderId}
        orderTotal={order.total}
        refundedAmount={order.refundAmount || 0}
        open={showRefundDialog}
        onOpenChange={setShowRefundDialog}
        onSuccess={() => {
          console.log('Refund processed successfully')
        }}
      />
    </div>
  )
}
