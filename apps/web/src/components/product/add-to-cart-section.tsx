'use client'

import { useState } from 'react'
import { Product } from '@repo/shared/types'
import { Button } from '@repo/ui'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useOptimisticCart } from '~/hooks/use-optimistic-cart'
import { serializeDates } from '~/lib/utils/serialize'

interface AddToCartSectionProps {
  product: Product
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem, isAdding } = useOptimisticCart()

  const isOutOfStock = product.inventory === 0
  const maxQuantity = product.inventory

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const newValue = prev + delta
      return Math.min(Math.max(1, newValue), maxQuantity)
    })
  }

  const handleAddToCart = async () => {
    const serializedProduct = serializeDates(product)
    await addItem(product.id, quantity, serializedProduct)
    setQuantity(1)
  }

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold">Add to Cart</h2>

      {/* Quantity Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block">Quantity</label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1 || isOutOfStock}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="w-20 text-center">
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1
                setQuantity(Math.min(Math.max(1, val), maxQuantity))
              }}
              className="w-full text-center border rounded px-2 py-1"
              min={1}
              max={maxQuantity}
              disabled={isOutOfStock}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= maxQuantity || isOutOfStock}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {!isOutOfStock && (
          <p className="text-sm text-muted-foreground mt-2">
            {maxQuantity} available
          </p>
        )}
      </div>

      {/* Add to Cart Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        {isAdding ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </Button>

      {/* Stock Warning */}
      {!isOutOfStock && product.inventory <= 10 && (
        <p className="text-sm text-yellow-600 font-medium">
          ⚠️ Only {product.inventory} left in stock - order soon!
        </p>
      )}
    </div>
  )
}
