'use client'

import {
  Badge,
  Button,
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

interface Product {
  id: string
  name: string
  slug: string
  price: number
  inventory: number
  status: ProductStatus
  category: {
    id: string
    name: string
  } | null
  _count: {
    orderItems: number
  }
}

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
}

/**
 * ProductsTable Component
 *
 * Displays products in a sortable, paginated table.
 * Handles product listing, sorting, and pagination for admin interface.
 */
export function ProductsTable({
  products,
  pagination,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
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

  return (
    <div className="space-y-4 rounded-md p-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSortChange('name')}
                  className="flex items-center gap-1"
                >
                  Product
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSortChange('price')}
                  className="flex items-center gap-1"
                >
                  Price
                  {getSortIcon('price')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSortChange('inventory')}
                  className="flex items-center gap-1"
                >
                  Inventory
                  {getSortIcon('inventory')}
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="text-gray-500 hover:text-gray-50"
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="outline">{product.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Uncategorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        product.inventory < 10
                          ? 'text-destructive font-semibold'
                          : ''
                      }
                    >
                      {product.inventory}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        product.status === 'ACTIVE'
                          ? 'bg-active hover:bg-active-hover  text-gray-50'
                          : product.status === 'INACTIVE'
                            ? 'bg-inactive hover:bg-inactive-hover text-gray-50'
                            : 'bg-discontinued hover:bg-discontinued-hover text-gray-50'
                      )}
                      variant={getStatusBadgeVariant(product.status)}
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{product._count.orderItems}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/products/${product.id}` as Route}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/products/${product.id}/edit` as Route}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
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
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
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
