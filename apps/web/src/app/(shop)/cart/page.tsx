'use client'

import { useCart } from '~/hooks/use-cart'
import { CartItem as CartItemComponent } from '~/components/cart/cart-item'
import { CartSummary } from '~/components/cart/cart-summary'
import { Button } from '@repo/ui'
import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items } = useCart()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">
          Add some products to get started!
        </p>
        <Button size="lg" asChild>
          <Link href="/products">
            Browse Products
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItemComponent key={item.id} item={item} />
          ))}
        </div>

        {/* Cart Summary */}
        <div>
          <CartSummary />
        </div>
      </div>
    </div>
  )
}
