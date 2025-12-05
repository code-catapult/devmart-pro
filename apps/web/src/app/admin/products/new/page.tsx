'use client'

import { ProductForm } from '~/components/admin/ProductForm'
import { api, type RouterOutputs } from '~/utils/api'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@repo/ui'

// Type for the category tree with recursive children
type CategoryTreeNode = RouterOutputs['admin']['categories']['getTree'][number]

/**
 * New Product Page
 *
 * Client component for creating new products.
 * Uses tRPC mutation with cache invalidation and navigation.
 */
export default function NewProductPage() {
  const router = useRouter()
  const utils = api.useUtils()

  // Fetch categories for dropdown
  const { data: categoryTree, isLoading: categoriesLoading } =
    api.admin.categories.getTree.useQuery()

  // Flatten category tree for dropdown
  const categories = categoryTree ? flattenCategories(categoryTree) : []

  // Create product mutation
  const createProduct = api.admin.products.create.useMutation({
    onSuccess: async (newProduct) => {
      // Show success message
      toast.success(`Product "${newProduct.name}" created successfully`)

      // Invalidate product list cache (triggers refetch)
      await utils.admin.products.list.invalidate()

      // Navigate to product list
      router.push('/admin/products')
    },
    onError: (error) => {
      // Show error message
      toast.error(`Failed to create product: ${error.message}`)
    },
  })

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
          <p className="text-muted-foreground">
            Add a new product to your catalog
          </p>
        </div>
      </div>

      {/* Product Form */}
      {categoriesLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading categories...</div>
        </div>
      ) : (
        <ProductForm
          onSubmit={async (data) => {
            await createProduct.mutateAsync({
              ...data,
              slug: data.slug || '', // Ensure slug is always provided (empty string converts to undefined via schema)
            })
          }}
          isSubmitting={createProduct.isPending}
          categories={categories}
        />
      )}
    </div>
  )
}

/**
 * Flatten category tree for dropdown
 *
 * Converts hierarchical tree to flat array with indentation.
 */
function flattenCategories(
  categories: CategoryTreeNode[],
  level = 0
): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = []

  for (const category of categories) {
    // Add current category with indentation
    result.push({
      id: category.id,
      name: '  '.repeat(level) + category.name,
    })

    // Recursively add children
    if (category.children && category.children.length > 0) {
      result.push(...flattenCategories(category.children, level + 1))
    }
  }

  return result
}
