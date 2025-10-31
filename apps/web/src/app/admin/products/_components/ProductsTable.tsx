'use client'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import {
  Edit,
  Eye,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProductStatus } from '@repo/shared/types'
import { cn } from '@repo/shared/utils'
import { Route } from 'next'
import Image from 'next/image'
import type { RouterOutputs } from '~/utils/api'
import { api } from '~/utils/api'
import { Pagination } from '~/components/ui/pagination'
import { StockLevelBadge } from '~/components/admin/stock-level-badge'
import { InventoryAdjustmentDialog } from '~/components/admin/inventory-adjustment-dialog'
import { ProductStatusToggle } from '~/components/admin/product-status-toggle'
import { toast } from 'sonner'

// Extract Product type from tRPC router output - always in sync with API
type Product = RouterOutputs['admin']['products']['list']['products'][number]

interface ProductsTableProps {
  products: Product[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  sortBy: 'name' | 'price' | 'inventory' | 'createdAt'
  sortOrder: 'asc' | 'desc'
  onSortChange: (field: 'name' | 'price' | 'inventory' | 'createdAt') => void
  onPageChange: (page: number) => void
  // NEW: Selection props
  selectedIds: string[]
  onToggleSelection: (productId: string) => void
  onToggleSelectAll: () => void
}

/**
 * ProductsTable Component
 *
 * Displays products in a sortable, paginated table with bulk selection (desktop) or card layout (mobile).
 * Handles product listing, sorting, pagination, and row selection for admin interface.
 *
 * Responsive Design:
 * - Desktop (≥768px): Traditional table with sortable columns and checkboxes
 * - Mobile (<768px): Card-based layout with key information stacked
 */
export function ProductsTable({
  products,
  pagination,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  // NEW: Selection props
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
}: ProductsTableProps) {
  const [productAdjustment, setProductAdjustment] = useState<{
    id: string
    name: string
    inventory: number
  } | null>(null)

  // Delete product state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Delete product mutation
  const utils = api.useUtils()
  const router = useRouter()
  const deleteMutation = api.admin.products.delete.useMutation({
    onSuccess: async () => {
      toast.success(
        `"${productToDelete?.name}" has been discontinued successfully`
      )

      // Invalidate product list cache
      await utils.admin.products.list.invalidate()

      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setProductToDelete(null)

      // Refresh current page
      router.refresh()
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`)
    },
  })

  // Handle delete button click - capture product and open dialog
  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteMutation.mutate({ id: productToDelete.id, hardDelete: false })
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getSortIcon = (field: 'name' | 'price' | 'inventory' | 'createdAt') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  // NEW: Calculate master checkbox state
  const allCurrentIds = products.map((p) => p.id)
  const allCurrentSelected =
    allCurrentIds.length > 0 &&
    allCurrentIds.every((id) => selectedIds.includes(id))
  const someCurrentSelected =
    allCurrentIds.some((id) => selectedIds.includes(id)) && !allCurrentSelected

  return (
    <div className="space-y-4 rounded-md p-2">
      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* NEW: Master checkbox column */}
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    someCurrentSelected ? 'indeterminate' : allCurrentSelected
                  }
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all products on this page"
                />
              </TableHead>
              {/* Name (Sortable) */}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => onSortChange('name')}
                  className="flex items-center gap-2 hover:bg-transparent"
                >
                  Product
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              {/* Category */}
              <TableHead>Category</TableHead>
              {/* Price (Sortable) */}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => onSortChange('price')}
                  className="flex items-center gap-2 hover:bg-transparent"
                >
                  Price
                  {getSortIcon('price')}
                </Button>
              </TableHead>
              {/* Inventory (Sortable) */}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => onSortChange('inventory')}
                  className="flex items-center gap-2 hover:bg-transparent"
                >
                  Inventory
                  {getSortIcon('inventory')}
                </Button>
              </TableHead>
              {/* Status */}
              <TableHead>Status</TableHead>
              {/* Actions */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7} // Updated from 6 to 7 for new checkbox column
                  className="h-24 text-center text-muted-foreground"
                >
                  No products found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  // NEW: Highlight selected rows
                  className={cn(
                    selectedIds.includes(product.id) && 'bg-muted/50'
                  )}
                >
                  {/* NEW: Row checkbox */}
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => onToggleSelection(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  {/* Product Name & Image */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images.length > 0 ? (
                        <Image
                          src={
                            product.images[0] || 'https://placehold.co/400x400'
                          }
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-500">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {/* Category */}
                  <TableCell>
                    {product.category ? (
                      <Badge variant="outline">{product.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        Uncategorized
                      </span>
                    )}
                  </TableCell>
                  {/* Price */}
                  <TableCell className="text-gray-500">
                    {formatPrice(product.price)}
                  </TableCell>
                  {/* Inventory */}
                  <TableCell>
                    <StockLevelBadge inventory={product.inventory} />
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <ProductStatusToggle
                      productId={product.id}
                      currentStatus={product.status as ProductStatus}
                      productName={product.name}
                    />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setProductAdjustment({
                            id: product.id,
                            name: product.name,
                            inventory: product.inventory,
                          })
                        }
                        title="Adjust Inventory"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/products/${product.id}/edit` as Route}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit {product.name}</span>
                        </Link>
                      </Button>
                      {/* Delete Button with Confirmation */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete {product.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (hidden on desktop) */}
      <div className="md:hidden flex items-center gap-2 mb-2">
        <Checkbox
          checked={someCurrentSelected ? 'indeterminate' : allCurrentSelected}
          onCheckedChange={onToggleSelectAll}
          aria-label="Select all products on this page"
        />
        <span className="inline-block text-gray-500">Select All</span>
      </div>
      <div className="md:hidden space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className={cn(
                'border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/50 transition-colors',
                selectedIds.includes(product.id) && 'bg-muted/50 border-primary'
              )}
            >
              {/* Checkbox & Product Name & Status */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.includes(product.id)}
                  onCheckedChange={() => onToggleSelection(product.id)}
                  aria-label={`Select ${product.name}`}
                  className="mt-1 bg-gray-100"
                />
                <div className="flex-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base">{product.name}</h3>
                  <ProductStatusToggle
                    productId={product.id}
                    currentStatus={product.status}
                    productName={product.name}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="text-sm mb-8">
                <div className="flex items-center gap-2">
                  {product.category ? (
                    <Badge variant="outline">{product.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Uncategorized</span>
                  )}
                </div>
              </div>

              {/* Inventory & Price */}
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  <StockLevelBadge inventory={product.inventory} />
                </span>
                <span className="font-semibold text-base">
                  {formatPrice(product.price)}
                </span>
              </div>

              {/* Action Buttons - Touch-friendly size */}
              <div className="mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProductAdjustment({
                      id: product.id,
                      name: product.name,
                      inventory: product.inventory,
                    })
                  }
                  className="h-10 w-10"
                  title="Adjust Inventory"
                >
                  <div className="relative">
                    <span className="absolute bottom-3.5 left-5.25 text-lg">
                      +
                    </span>
                    <Package className="h-10 w-10" />
                  </div>
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  asChild
                >
                  <Link href={`/admin/products/${product.id}/edit` as Route}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3"
                  onClick={() => handleDeleteClick(product)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls - Using shared Pagination component */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalCount}
        itemsPerPage={pagination.limit}
        onPageChange={onPageChange}
      />

      {/* Inventory Adjustment Dialog */}
      {productAdjustment && (
        <InventoryAdjustmentDialog
          open={!!productAdjustment}
          onOpenChange={(open) => {
            if (!open) setProductAdjustment(null)
          }}
          productId={productAdjustment.id}
          productName={productAdjustment.name}
          currentInventory={productAdjustment.inventory}
          onSuccess={() => {
            setProductAdjustment(null)
            // The mutation already invalidates the query,
            // so the table will automatically refresh
          }}
        />
      )}

      {/* Delete Product Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discontinue &ldquo;{productToDelete?.name}&rdquo;. The
              product will no longer be visible to customers, but order history
              will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? 'Discontinuing...'
                : 'Discontinue Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
