'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '~/utils/api'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { ProductsTable } from './ProductsTable'
import { BulkActionsBar } from '~/components/admin/bulk-actions'
import { useDebounce } from '~/hooks/use-debounce'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { Route } from 'next'

interface ProductsListClientProps {
  initialFilters: {
    search: string
    categoryId?: string
    status: string
    sortBy: 'name' | 'price' | 'inventory' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    page: number
  }
}

/**
 * ProductsListClient
 *
 * Client component for interactive product listing.
 * Handles search, filters, sorting, and pagination.
 */
export function ProductsListClient({
  initialFilters,
}: ProductsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state for filters
  const [search, setSearch] = useState(initialFilters.search)
  const [status, setStatus] = useState(initialFilters.status)
  const [sortBy, setSortBy] = useState(initialFilters.sortBy)
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder)
  const [page, setPage] = useState(initialFilters.page)

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Debounce search input (avoid API calls on every keystroke)
  const debouncedSearch = useDebounce(search, 300)

  // Fetch products with tRPC
  const { data, isLoading, error } = api.admin.products.list.useQuery({
    search: debouncedSearch,
    status:
      status === 'ALL'
        ? undefined
        : (status as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'),
    sortBy,
    sortOrder,
    page,
    limit: 20,
  })

  // Update URL when filters change (for shareability and back button)
  const updateURL = (newFilters: Partial<typeof initialFilters>) => {
    const params = new URLSearchParams(searchParams)

    if (newFilters.search !== undefined) {
      if (newFilters.search) {
        params.set('search', newFilters.search)
      } else {
        params.delete('search')
      }
    }
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy)
    if (newFilters.sortOrder) params.set('sortOrder', newFilters.sortOrder)
    if (newFilters.page) params.set('page', newFilters.page.toString())

    router.push(`/admin/products?${params.toString()}` as Route)
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page
    updateURL({ search: value, page: 1 })
  }

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
    updateURL({ status: value, page: 1 })
  }

  // Handle sort change
  const handleSortChange = (field: typeof sortBy) => {
    // Toggle sort order if clicking the same field, otherwise default to 'asc'
    const newOrder = field === sortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortOrder(newOrder)
    updateURL({ sortBy: field, sortOrder: newOrder })
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL({ page: newPage })
  }

  // NEW: Toggle individual product selection
  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  // NEW: Toggle all products on current page
  const toggleSelectAll = () => {
    if (!data?.products) return

    const allCurrentIds = data.products.map((p) => p.id)
    const allSelected = allCurrentIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => prev.filter((id) => !allCurrentIds.includes(id)))
    } else {
      // Select all on current page (preserve selections from other pages)
      setSelectedIds((prev) => [...new Set([...prev, ...allCurrentIds])])
    }
  }

  // NEW: Clear all selections
  const clearSelection = () => setSelectedIds([])

  return (
    <div className="flex flex-col gap-4">
      {/* NEW: Bulk Actions Bar (only visible when items selected) */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedIds={selectedIds}
          onClearSelection={clearSelection}
          onSuccess={() => {
            clearSelection()
            // Optionally refetch data - tRPC cache invalidation handles this
          }}
        />
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 w-full sm:w-auto">
        {/* Search */}
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm text-gray-600"
        />

        {/* Status Filter */}
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="md:w-[180px] text-gray-500">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Create Product Button */}
        <Button asChild className="w-[180px] sm:w-fit">
          <Link href={'/admin/products/new' as Route}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Products Table */}
      {isLoading && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading products...</div>
        </div>
      )}

      {error && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-destructive">
            Error loading products: {error.message}
          </div>
        </div>
      )}

      {data && (
        <ProductsTable
          products={data.products}
          pagination={data.pagination}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
          // NEW: Pass selection props to ProductsTable
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleSelectAll={toggleSelectAll}
        />
      )}
    </div>
  )
}
