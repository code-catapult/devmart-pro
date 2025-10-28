'use client'

import { use } from 'react'
import { ProductForm } from '~/components/admin/ProductForm'
import { api, type RouterOutputs } from '~/utils/api'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ProductMetrics } from '~/components/admin/product-metrics'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@repo/ui'

// Type for the category tree with recursive children
type CategoryTreeNode = RouterOutputs['admin']['categories']['getTree'][number]

/**
 * Edit Product Page
 *
 * Client component for editing existing products.
 * Includes delete functionality with confirmation dialog.
 */
export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const utils = api.useUtils()
  const { id: productId } = use(params)

  // Fetch product data
  const { data: product, isLoading: productLoading } =
    api.admin.products.getById.useQuery({ id: productId })

  // Fetch categories
  const { data: categoryTree, isLoading: categoriesLoading } =
    api.admin.categories.getTree.useQuery()

  const categories = categoryTree ? flattenCategories(categoryTree) : []

  // Update product mutation
  const updateProduct = api.admin.products.update.useMutation({
    onSuccess: (updatedProduct) => {
      toast.success(`Product "${updatedProduct.name}" updated successfully`)

      // Invalidate both list and detail caches
      utils.admin.products.list.invalidate()
      utils.admin.products.getById.invalidate({ id: productId })

      router.push('/admin/products')
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`)
    },
  })

  // Delete product mutation
  const deleteProduct = api.admin.products.delete.useMutation({
    onSuccess: () => {
      toast.success('Product discontinued successfully')

      // Invalidate product list cache
      utils.admin.products.list.invalidate()

      router.push('/admin/products')
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`)
    },
  })

  const handleDelete = () => {
    deleteProduct.mutate({ id: productId, hardDelete: false })
  }

  if (productLoading || categoriesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading product...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-destructive">Product not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header with Back and Delete Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" asChild className="text-gray-700">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl text-muted-foreground font-bold tracking-tight">
              Edit Product
            </h1>
            <p className="text-muted-foreground">Update product details</p>
          </div>
        </div>

        {/* Delete Button with Confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleteProduct.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Product
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discontinue &ldquo;{product.name}&rdquo;. The product
                will no longer be visible to customers, but order history will
                be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Discontinue Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Product Form */}
      <ProductForm
        initialData={{
          name: product.name,
          description: product.description ?? undefined, // Convert null to undefined
          price: product.price, // Already in cents from server
          inventory: product.inventory,
          categoryId: product.categoryId,
          images: product.images,
          status: product.status,
          slug: product.slug,
        }}
        onSubmit={async (data) => {
          await updateProduct.mutateAsync({
            id: productId,
            ...data,
            slug: data.slug || '', // Ensure slug is always provided
          })
        }}
        isSubmitting={updateProduct.isPending}
        categories={categories}
      />
      {/* Product Performance Metrics Section - NEW */}
      <div className="space-y-4">
        <div className="border-t pt-8">
          <ProductMetrics productId={productId} />
        </div>
      </div>
    </div>
  )
}

function flattenCategories(
  categories: CategoryTreeNode[],
  level = 0
): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = []

  for (const category of categories) {
    result.push({
      id: category.id,
      name: '  '.repeat(level) + category.name,
    })

    if (category.children && category.children.length > 0) {
      result.push(...flattenCategories(category.children, level + 1))
    }
  }

  return result
}
