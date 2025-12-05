import { Suspense } from 'react'
import { Metadata } from 'next'
import { ProductsListClient } from './_components/ProductsListClient'

/**
 * Products Admin Page (Server Component)
 *
 * Server-side product listing with search, filters, and pagination.
 * Delegates interactivity to client components.
 */

export const metadata: Metadata = {
  title: 'Products | Admin Dashboard',
  description: 'Manage products, inventory, and pricing',
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    category?: string
    status?: string
    priceMin?: string
    priceMax?: string
    inventoryMin?: string
    inventoryMax?: string
    page?: string
    sortBy?: string
    sortOrder?: string
  }>
}) {
  const params = await searchParams
  // Parse search params (URL query strings)
  const page = parseInt(params.page || '1', 10)
  const search = params.search || ''
  const categoryId = params.category || undefined
  const status = params.status || 'ALL'

  // Parse price filters (convert dollars to cents)
  const priceMin = params.priceMin
    ? parseInt(params.priceMin, 10) * 100
    : undefined
  const priceMax = params.priceMax
    ? parseInt(params.priceMax, 10) * 100
    : undefined

  // Parse inventory filters
  const inventoryMin = params.inventoryMin
    ? parseInt(params.inventoryMin, 10)
    : undefined
  const inventoryMax = params.inventoryMax
    ? parseInt(params.inventoryMax, 10)
    : undefined

  const sortBy = (params.sortBy || 'createdAt') as
    | 'name'
    | 'price'
    | 'inventory'
    | 'createdAt'
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc'

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between p-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p>Manage your product catalog, inventory, and pricing</p>
        </div>
      </div>

      {/* Product List (Client Component for interactivity) */}
      <Suspense fallback={<ProductsListSkeleton />}>
        <ProductsListClient
          initialFilters={{
            search,
            categoryId,
            status,
            priceMin,
            priceMax,
            inventoryMin,
            inventoryMax,
            sortBy,
            sortOrder,
            page,
          }}
        />
      </Suspense>
    </div>
  )
}

/**
 * Loading skeleton shown while data fetches
 */
function ProductsListSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="h-[600px] animate-pulse bg-muted" />
    </div>
  )
}
