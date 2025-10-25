'use client'

import {
  Badge,
  Button,
  Checkbox, // NEW
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
} from 'lucide-react'
import Link from 'next/link'
import type { ProductStatus } from '@repo/shared/types'
import { cn } from '@repo/shared/utils'
import { Route } from 'next'
import Image from 'next/image'
import type { RouterOutputs } from '~/utils/api'

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
 * Displays products in a sortable, paginated table with bulk selection.
 * Handles product listing, sorting, pagination, and row selection for admin interface.
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
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getStatusBadgeVariant = (status: ProductStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'INACTIVE':
        return 'secondary'
      case 'DISCONTINUED':
        return 'outline'
      default:
        return 'secondary'
    }
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
    <div className="space-y-4">
      <div className="rounded-md border">
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
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {product.category.name}
                      </Badge>
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
                    <span
                      className={cn(
                        product.inventory <= 10 &&
                          'text-destructive font-medium',
                        product.inventory > 10 &&
                          product.inventory <= 50 &&
                          'text-yellow-600 font-medium',
                        product.inventory > 50 && 'text-gray-500 font-medium'
                      )}
                    >
                      {product.inventory}
                    </span>
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(product.status)}
                      className={cn(
                        product.status === 'ACTIVE'
                          ? 'bg-active hover:bg-active-hover  text-gray-50'
                          : product.status === 'INACTIVE'
                            ? 'bg-inactive hover:bg-inactive-hover text-gray-50'
                            : 'bg-discontinued hover:bg-discontinued-hover text-gray-50'
                      )}
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/products/${product.id}/edit` as Route}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit {product.name}</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.totalCount)}{' '}
          of {pagination.totalCount} products
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {/* Show first page */}
            {pagination.page > 2 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                >
                  1
                </Button>
                {pagination.page > 3 && <span className="px-2">...</span>}
              </>
            )}

            {/* Show previous page */}
            {pagination.hasPreviousPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
              >
                {pagination.page - 1}
              </Button>
            )}

            {/* Show current page */}
            <Button variant="default" size="sm" disabled>
              {pagination.page}
            </Button>

            {/* Show next page */}
            {pagination.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
              >
                {pagination.page + 1}
              </Button>
            )}

            {/* Show last page */}
            {pagination.page < pagination.totalPages - 1 && (
              <>
                {pagination.page < pagination.totalPages - 2 && (
                  <span className="px-2">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.totalPages)}
                >
                  {pagination.totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
