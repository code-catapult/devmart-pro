'use client'

import { api } from '~/utils/api'
import { ProductCard } from './product-card'

interface RelatedProductsProps {
  productId: string
  categoryId: string
}

export function RelatedProducts({
  productId,
  categoryId,
}: RelatedProductsProps) {
  const { data: relatedProducts, isLoading } = api.products.getRelated.useQuery(
    {
      productId,
      categoryId,
      limit: 4,
    }
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">You May Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-80 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!relatedProducts || relatedProducts.length === 0) {
    return null // Don't show section if no related products
  }

  return (
    <div className="space-y-6 border-t pt-8">
      <h2 className="text-2xl font-bold">You May Also Like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
