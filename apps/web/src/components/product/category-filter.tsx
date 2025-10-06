'use client'

import { api } from '~/utils/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

export function CategoryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  const { data: categories, isLoading } = api.categories.getAll.useQuery()

  const handleCategoryClick = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId) {
      params.set('category', categoryId)
    } else {
      params.delete('category')
    }

    // Reset to page 1 when changing filters
    params.set('page', '1')

    router.push(`/products?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold mb-4">Categories</h3>

      <Button
        variant={!currentCategory ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => handleCategoryClick(null)}
      >
        All Products
        <Badge variant="secondary" className="ml-auto">
          {categories?.reduce(
            (sum, cat) => sum + (cat._count.products || 0),
            0
          ) || 0}
        </Badge>
      </Button>

      {categories?.map((category) => (
        <Button
          key={category.id}
          variant={currentCategory === category.id ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => handleCategoryClick(category.id)}
        >
          {category.name}
          <Badge variant="secondary" className="ml-auto">
            {category._count.products}
          </Badge>
        </Button>
      ))}
    </div>
  )
}
