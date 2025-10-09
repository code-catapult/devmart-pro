'use client'

import { useCart } from '~/hooks/use-cart'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { formatPrice } from '~/lib/utils/price'
import Link from 'next/link'
import { Route } from 'next'

export function CartSummary() {
  const { items, total } = useCart()

  const subtotal = total
  const tax = Math.round(total * 0.08) // 8% tax
  const shipping = total >= 10000 ? 0 : 999 // Free over $100
  const finalTotal = subtotal + tax + shipping

  return (
    <div className="border rounded-lg p-6 space-y-4 sticky top-4">
      <h2 className="text-xl font-semibold">Order Summary</h2>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal ({items.length} items)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Estimated Tax</span>
          <span>{formatPrice(tax)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>{formatPrice(finalTotal)}</span>
      </div>

      <Button className="w-full" size="lg" asChild>
        <Link href={'/checkout' as Route}>Proceed to Checkout</Link>
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Shipping and taxes calculated at checkout
      </p>
    </div>
  )
}
