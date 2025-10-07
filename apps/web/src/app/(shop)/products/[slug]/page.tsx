import { notFound } from 'next/navigation'
import Image from 'next/image'
import { api, staticApi } from '~/trpc/server'

// Generate static params for SSG (optional but recommended)
export async function generateStaticParams() {
  const caller = await staticApi()

  // Generate static pages for all active products
  const products = await caller.products.getAll({ page: 1, limit: 100 })

  return products.products.map((product) => ({
    slug: product.slug,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const caller = await api()
  const { slug } = await params

  try {
    const product = await caller.products.getBySlug({ slug })

    return {
      title: `${product.name} | DevMart Pro`,
      description: product.description,
      openGraph: {
        title: product.name,
        description: product.description,
        images: [{ url: product.images[0] }],
      },
    }
  } catch {
    return {
      title: 'Product Not Found | DevMart Pro',
    }
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const caller = await api()
  const { slug } = await params
  let product

  try {
    product = await caller.products.getBySlug({ slug })
  } catch {
    notFound() // Shows 404 page
  }

  // Basic shell - we'll add components progressively in later tasks
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Breadcrumb will be added in Task 2 */}

        {/* Temporary basic product display - will be replaced with components */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold text-primary">
            ${(product.price / 100).toFixed(2)}
          </p>
          <p className="text-muted-foreground">{product.description}</p>

          {/* Show first image temporarily */}
          {product.images.length > 0 && (
            <div className="aspect-square w-full max-w-md bg-gray-100 rounded-lg overflow-hidden relative">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="border-t pt-4">
            <p>
              <strong>Category:</strong> {product.category.name}
            </p>
            <p>
              <strong>Inventory:</strong> {product.inventory} in stock
            </p>
            <p>
              <strong>Reviews:</strong> {product._count.reviews}
            </p>
          </div>
        </div>

        {/* Image Gallery will be added in Task 3 */}
        {/* Product Info component will be added in Task 4 */}
        {/* Add to Cart will be added in Task 5 */}
        {/* Related Products will be added in Task 6 */}
      </div>
    </div>
  )
}
