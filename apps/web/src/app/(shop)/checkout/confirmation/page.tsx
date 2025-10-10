import { notFound } from 'next/navigation'
import { api } from '~/trpc/server'
import { formatPrice } from '~/lib/utils/price'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Check, Package, CreditCard, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { OrderStatus } from '@prisma/client'
import { ProductImage } from './product-image'

// Type for shipping address to match our schema
type ShippingAddress = {
  name: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'success' | 'destructive'
  }
> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  PROCESSING: { label: 'Processing', variant: 'default' },
  SHIPPED: { label: 'Shipped', variant: 'secondary' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
}

export const metadata: Metadata = {
  title: 'Order Confirmation',
  description: 'Your order has been confirmed',
  robots: 'noindex', // Don't index confirmation pages
}

interface ConfirmationPageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams

  if (!params.orderId) {
    notFound()
  }

  const caller = await api()
  const order = await caller.orders.getById({
    orderId: params.orderId,
  })

  if (!order) {
    notFound()
  }

  // Type-safe shipping address
  const shippingAddress = order.shippingAddress as ShippingAddress
  const statusConfig = ORDER_STATUS_CONFIG[order.status]

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      {/* Success Message */}
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
          aria-hidden="true"
        >
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We&apos;ve sent a confirmation email to{' '}
          <span className="font-medium">{order.user.email}</span>
        </p>
      </div>

      {/* Order Details */}
      <div className="border rounded-lg p-6 space-y-6">
        {/* Order Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="font-mono font-semibold text-lg">
              {order.orderNumber}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm text-muted-foreground">Order Date</p>
            <div className="flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <time dateTime={order.createdAt.toISOString()}>
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Order Items</h2>
          <ul className="space-y-4" role="list">
            {order.orderItems.map((item) => {
              const imageUrl = item.product.images?.[0] ?? '/placeholder.jpg'

              return (
                <li key={item.id} className="flex gap-4">
                  <ProductImage
                    src={imageUrl}
                    alt={`${item.product.name} product image`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                  <p className="font-semibold flex-shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Shipping Address */}
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <MapPin
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            Shipping Address
          </h2>
          <address className="text-sm text-muted-foreground not-italic">
            <p className="font-medium text-foreground">
              {shippingAddress.name}
            </p>
            <p>{shippingAddress.address1}</p>
            {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
            <p>
              {shippingAddress.city}, {shippingAddress.state}{' '}
              {shippingAddress.postalCode}
            </p>
            <p>{shippingAddress.country}</p>
          </address>
        </div>

        {/* Payment Information */}
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <CreditCard
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            Payment Information
          </h2>
          <div className="text-sm space-y-1">
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium">Credit Card</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-xs">
                {order.stripePaymentIntentId}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-green-600 font-medium">
                Payment Successful
              </span>
            </p>
          </div>
        </div>

        {/* Order Total */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatPrice(order.shipping)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-4">
          <Package
            className="h-6 w-6 text-blue-600 flex-shrink-0"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold text-blue-900 mb-2">
              What happens next?
            </h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>You&apos;ll receive an email confirmation shortly</li>
              <li>We&apos;ll send tracking info when your order ships</li>
              <li>Estimated delivery: 3-5 business days</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/products">View Products</Link>
        </Button>
      </div>
    </div>
  )
}
