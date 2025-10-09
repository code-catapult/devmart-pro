'use client'

import { useState } from 'react'
import { CartItem as CartItemType, Product } from '@prisma/client'
import { useOptimisticCart } from '~/hooks/use-optimistic-cart'
import { Button } from '~/components/ui/button'
import { Trash2, Minus, Plus } from 'lucide-react'
import { formatPrice } from '~/lib/utils/price'
import { SerializeDates } from '~/lib/utils/serialize'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'

interface CartItemProps {
  item: SerializeDates<CartItemType & { product: Product }>
}

export function CartItem({ item }: CartItemProps) {
  const { updateItem, removeItem } = useOptimisticCart()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleQuantityChange = async (delta: number) => {
    const newQuantity = item.quantity + delta

    if (newQuantity < 1 || newQuantity > item.product.inventory) {
      return
    }

    setIsUpdating(true)
    await updateItem(item.id, newQuantity)
    setIsUpdating(false)
  }

  const handleRemove = async () => {
    await removeItem(item.id)
  }

  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
        <div className="relative w-24 h-24 rounded bg-gray-100">
          <Image
            src={item.product.images[0] || '/placeholder.jpg'}
            alt={item.product.name}
            fill
            className="object-cover rounded"
            unoptimized
          />
        </div>
      </Link>

      <div className="flex-1 flex flex-col">
        <Link href={`/products/${item.product.slug}`}>
          <h3 className="font-semibold hover:underline">{item.product.name}</h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {item.product.description}
        </p>

        <div className="mt-auto flex items-center gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1 || isUpdating}
            >
              <Minus className="h-3 w-3" />
            </Button>

            <span className="w-8 text-center">{item.quantity}</span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(1)}
              disabled={item.quantity >= item.product.inventory || isUpdating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <span className="font-semibold">
            {formatPrice(item.product.price * item.quantity)}
          </span>

          {/* Remove Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove item?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {item.product.name} from your
                  cart?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
