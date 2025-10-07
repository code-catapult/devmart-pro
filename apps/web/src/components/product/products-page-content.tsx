'use client'

import { api } from '~/utils/api'
import { ProductGrid } from '~/components/product/product-grid'
import { CategoryFilter } from '~/components/product/category-filter'
import { useSearchParams } from 'next/navigation'
import { ProductSearch } from '~/components/product/product-search'
import { SortControls } from '~/components/product/sort-controls'
import { Pagination } from '~/components/ui/pagination'

export default function ProductsPageContent() {
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('category') || undefined
  const sortBy =
    (searchParams.get('sortBy') as 'name' | 'price' | 'createdAt') ||
    'createdAt'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

  const { data, isLoading, error } = api.products.getAll.useQuery({
    page,
    search,
    categoryId,
    sortBy,
    sortOrder,
    limit: 4,
  })

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading products</p>
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <CategoryFilter />
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Search Bar */}
        <ProductSearch />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">
              {data?.products.length || 0} of {data?.pagination.total || 0}{' '}
              products
            </p>
          </div>
          <SortControls />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-80 bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            <ProductGrid products={data?.products || []} />

            {/* Pagination Controls */}
            {data && (
              <Pagination
                currentPage={data.pagination.page}
                totalPages={data.pagination.pages}
                totalItems={data.pagination.total}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
