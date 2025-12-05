// 'use client'

// import { useCart } from '~/hooks/use-cart'
// import { Button, Separator } from '@repo/ui'
// import { formatPrice } from '@repo/shared/utils'
// import Link from 'next/link'
// import { Route } from 'next'

// export function CartSummary() {
//   const { items, total } = useCart()

//   const subtotal = total
//   const tax = Math.round(total * 0.08) // 8% tax
//   const shipping = total >= 10000 ? 0 : 999 // Free over $100
//   const finalTotal = subtotal + tax + shipping

//   return (
//     <div className="border rounded-lg p-6 space-y-4 sticky top-4">
//       <h2 className="text-xl font-semibold">Order Summary</h2>

//       <div className="space-y-2">
//         <div className="flex justify-between">
//           <span>Subtotal ({items.length} items)</span>
//           <span>{formatPrice(subtotal)}</span>
//         </div>

//         <div className="flex justify-between text-sm">
//           <span>Shipping</span>
//           <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
//         </div>

//         <div className="flex justify-between text-sm">
//           <span>Estimated Tax</span>
//           <span>{formatPrice(tax)}</span>
//         </div>
//       </div>

//       <Separator />

//       <div className="flex justify-between font-bold text-lg">
//         <span>Total</span>
//         <span>{formatPrice(finalTotal)}</span>
//       </div>

//       <Button className="w-full" size="lg" asChild>
//         <Link href={'/checkout' as Route}>Proceed to Checkout</Link>
//       </Button>

//       <p className="text-xs text-center text-muted-foreground">
//         Shipping and taxes calculated at checkout
//       </p>
//     </div>
//   )
// }

'use client'

import { useCart } from '~/hooks/use-cart'
import { Button, Separator } from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'
import Link from 'next/link'
import { Route } from 'next'

export function CartSummary() {
  const { items, total } = useCart()

  const subtotal = total
  const tax = Math.round(total * 0.08) // 8% tax
  const shipping = total >= 10000 ? 0 : 999 // Free over $100
  const finalTotal = subtotal + tax + shipping

  return (
    <div className="border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4 lg:sticky lg:top-4">
      <h2 className="text-lg sm:text-xl font-semibold">Order Summary</h2>

      <div className="space-y-2">
        <div className="flex justify-between text-sm sm:text-base">
          <span>Subtotal ({items.length} items)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between text-xs sm:text-sm">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
        </div>

        <div className="flex justify-between text-xs sm:text-sm">
          <span>Estimated Tax</span>
          <span>{formatPrice(tax)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-bold text-base sm:text-lg">
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
