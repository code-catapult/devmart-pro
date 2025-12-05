import { Product, Category } from '@repo/shared/types'
import { Badge } from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'

interface ProductInfoProps {
  product: Product & {
    category: Category
    _count: { reviews: number }
  }
}

export function ProductInfo({ product }: ProductInfoProps) {
  const isOutOfStock = product.inventory === 0
  const isLowStock = product.inventory > 0 && product.inventory <= 10

  return (
    <div className="space-y-4">
      {/* Category Badge */}
      <Badge variant="secondary">{product.category.name}</Badge>

      {/* Product Name */}
      <h1 className="text-3xl font-bold">{product.name}</h1>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-primary">
          {formatPrice(product.price)}
        </span>
      </div>

      {/* Inventory Status */}
      <div>
        {isOutOfStock ? (
          <Badge variant="destructive" className="text-base">
            Out of Stock
          </Badge>
        ) : isLowStock ? (
          <Badge variant="warning" className="text-base">
            Only {product.inventory} left in stock!
          </Badge>
        ) : (
          <Badge variant="success" className="text-base">
            In Stock
          </Badge>
        )}
      </div>

      {/* Description */}
      <div className="border-t pt-6">
        <h2 className="font-semibold text-lg mb-2">Product Description</h2>
        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Product Details */}
      <div className="border-t pt-6">
        <h2 className="font-semibold text-lg mb-4">Product Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Category</dt>
            <dd className="font-medium">{product.category.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Availability</dt>
            <dd className="font-medium">
              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Reviews</dt>
            <dd className="font-medium">
              {product._count.reviews}{' '}
              {product._count.reviews === 1 ? 'review' : 'reviews'}
            </dd>
          </div>
          {/* SKU */}
          <div>
            <dt className="text-sm text-muted-foreground">SKU</dt>
            <dd className="font-medium font-mono text-sm">{product.sku}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
