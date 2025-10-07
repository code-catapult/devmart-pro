import { notFound } from 'next/navigation'

import { api, staticApi } from '~/trpc/server'
import { Breadcrumb } from '~/components/ui/breadcrumb'
import { ProductImageGallery } from '~/components/product/product-image-gallery'

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

  // Build breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
  ]

  // Add category hierarchy
  if (product.category.parent) {
    breadcrumbItems.push({
      label: product.category.parent.name,
      href: `/products?category=${product.category.parent.id}`,
    })
  }

  breadcrumbItems.push({
    label: product.category.name,
    href: `/products?category=${product.category.id}`,
  })

  breadcrumbItems.push({
    label: product.name,
    href: `/products/${product.slug}`,
  })

  // Basic shell - we'll add components progressively in later tasks
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Breadcrumb will be added in Task 2 */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Temporary basic product display - will be replaced with components */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Image Gallery */}
          <ProductImageGallery
            images={product.images}
            productName={product.name}
          />

          {/* Right: Product Info (temporary basic display) */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-2xl font-semibold text-primary">
              ${(product.price / 100).toFixed(2)}
            </p>
            <p className="text-muted-foreground">{product.description}</p>

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
        </div>

        {/* Image Gallery will be added in Task 3 */}
        {/* Product Info component will be added in Task 4 */}
        {/* Add to Cart will be added in Task 5 */}
        {/* Related Products will be added in Task 6 */}
      </div>
    </div>
  )
}
