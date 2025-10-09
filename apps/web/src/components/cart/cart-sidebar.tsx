'use client'

import { useCart } from '~/hooks/use-cart'
import { useOptimisticCart } from '~/hooks/use-optimistic-cart'
import { closeCart } from '~/store/slices/cartSlice'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { formatPrice } from '~/lib/utils/price'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, ShoppingBag } from 'lucide-react'
import { Route } from 'next'

export function CartSidebar() {
  const { items, total, isOpen, dispatch } = useCart()
  const { removeItem } = useOptimisticCart()

  const handleClose = () => {
    dispatch(closeCart())
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({items.length})</SheetTitle>
          <SheetDescription>
            View and manage items in your shopping cart
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button asChild onClick={handleClose}>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6">
              <div className="px-6 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 rounded bg-gray-100">
                      <Image
                        src={item.product.images[0] || '/placeholder.jpg'}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded"
                        unoptimized
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                      <p className="font-semibold">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4">
              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shipping and taxes calculated at checkout
                </p>
              </div>

              <div className="space-y-2">
                <Button className="w-full" size="lg" asChild>
                  <Link href={'/cart' as Route} onClick={handleClose}>
                    View Cart
                  </Link>
                </Button>
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleClose}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
