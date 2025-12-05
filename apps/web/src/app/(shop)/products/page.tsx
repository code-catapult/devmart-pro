import { Suspense } from 'react'
import ProductsPageContent from '~/components/product/products-page-content'
// Loading skeleton for the entire products page
function ProductsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageContent />
    </Suspense>
  )
}
