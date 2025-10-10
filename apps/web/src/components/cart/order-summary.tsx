'use client'

import { useCart } from '~/hooks/use-cart'
import { Separator } from '~/components/ui/separator'
import { formatPrice } from '~/lib/utils/price'
import { ShoppingCart } from 'lucide-react'

export function OrderSummary() {
  const { items, total } = useCart()

  // Calculate totals
  const subtotal = total
  const tax = Math.round(total * 0.08) // 8% tax
  const shipping = total >= 10000 ? 0 : 999 // Free shipping over $100
  const finalTotal = subtotal + tax + shipping

  return (
    <div className="border rounded-lg p-6 space-y-4 sticky top-4 bg-gray-50 text-gray-700">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        Order Summary
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items in cart</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Subtotal ({items.length} items)
              </span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Tax</span>
              <span>{formatPrice(tax)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>

          {total >= 10000 && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-800 font-medium">
                ✓ You qualify for free shipping!
              </p>
            </div>
          )}

          {total < 10000 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                Add {formatPrice(10000 - total)} more for free shipping
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
