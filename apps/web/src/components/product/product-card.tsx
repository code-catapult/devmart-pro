import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@repo/shared/types'
import { Badge, Card, CardContent } from '@repo/ui'
import { formatPrice } from '@repo/shared/utils'
import { Route } from 'next'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.inventory === 0

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <Link href={`/products/${product.slug}` as Route}>
          <div className="relative aspect-square mb-4 overflow-hidden rounded-md bg-gray-100">
            <Image
              src={product.images[0] || ''}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
            />
            {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-2 right-2">
                Out of Stock
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-lg line-clamp-2 mb-1">
            {product.name}
          </h3>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
            {product.description}
          </p>

          <p className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </p>
        </Link>
      </CardContent>
    </Card>
  )
}
