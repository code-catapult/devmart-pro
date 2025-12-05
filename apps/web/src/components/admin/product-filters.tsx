'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { api } from '~/utils/api'

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui'

/**
 * ProductFilters
 *
 * Advanced filtering panel for products with URL state management.
 *
 * Filters:
 * - Search (text, case-insensitive)
 * - Price range (min/max in cents)
 * - Inventory range (min/max units)
 * - Category (single select)
 * - Status (ACTIVE/INACTIVE/DISCONTINUED)
 * - Date range (createdAt)
 *
 * Features:
 * - URL state persistence (shareable links)
 * - Active filter badges
 * - Clear all filters
 * - Real-time filter application
 */

export function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  // Fetch categories from API
  const { data: categoryTree } = api.admin.categories.getTree.useQuery()

  // Flatten category tree for dropdown
  const flattenCategories = (
    cats: typeof categoryTree,
    level = 0
  ): Array<{ id: string; name: string; level: number }> => {
    if (!cats) return []
    const result: Array<{ id: string; name: string; level: number }> = []
    cats.forEach((cat) => {
      result.push({ id: cat.id, name: cat.name, level })
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1))
      }
    })
    return result
  }

  const categories = flattenCategories(categoryTree)

  // Helper function to get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || categoryId
  }

  // Read current filters from URL
  const currentFilters = {
    search: searchParams.get('search') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    inventoryMin: searchParams.get('inventoryMin') || '',
    inventoryMax: searchParams.get('inventoryMax') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
  }

  // Count active filters (excluding search and page)
  const activeFilterCount = Object.entries(currentFilters).filter(
    ([key, value]) => key !== 'search' && value !== ''
  ).length

  const applyFilters = (filters: typeof currentFilters) => {
    const params = new URLSearchParams()

    // Add non-empty filters to URL (excluding "all" values)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    params.set('page', '1')

    router.push(`/admin/products?${params.toString()}`)
    setOpen(false)
  }

  const clearAllFilters = () => {
    router.push('/admin/products')
    setOpen(false)
  }

  const removeFilter = (filterKey: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(filterKey)
    router.push(`/admin/products?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      {/* Filter Trigger Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 h-10 sm:h-9">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] px-1.5"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        {/* Mobile-Optimized Sheet/Drawer */}
        <SheetContent
          className="w-full sm:w-[400px] overflow-y-auto flex flex-col"
          side="right"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg sm:text-xl">
              Filter Products
            </SheetTitle>
            <SheetDescription className="text-sm">
              Refine your product search with advanced filters
            </SheetDescription>
          </SheetHeader>

          {/* Filter Form - Scrollable Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const filters = {
                search: (formData.get('search') as string) || '',
                priceMin: (formData.get('priceMin') as string) || '',
                priceMax: (formData.get('priceMax') as string) || '',
                inventoryMin: (formData.get('inventoryMin') as string) || '',
                inventoryMax: (formData.get('inventoryMax') as string) || '',
                category: (formData.get('category') as string) || '',
                status: (formData.get('status') as string) || '',
              }
              applyFilters(filters)
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Scrollable Filter Fields */}
            <div className="flex-1 overflow-y-auto space-y-5 sm:space-y-4 py-2">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-base sm:text-sm">
                  Search
                </Label>
                <Input
                  id="search"
                  name="search"
                  placeholder="Product name, SKU, description..."
                  defaultValue={currentFilters.search}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label className="text-base sm:text-sm">Price Range</Label>
                <div className="grid grid-cols-2 gap-3 sm:gap-2">
                  <div>
                    <Input
                      id="priceMin"
                      name="priceMin"
                      type="number"
                      placeholder="Min ($)"
                      defaultValue={currentFilters.priceMin}
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      id="priceMax"
                      name="priceMax"
                      type="number"
                      placeholder="Max ($)"
                      defaultValue={currentFilters.priceMax}
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs sm:text-[11px] text-gray-500">
                  Enter price in dollars
                </p>
              </div>

              {/* Inventory Range */}
              <div className="space-y-2">
                <Label className="text-base sm:text-sm">Inventory Range</Label>
                <div className="grid grid-cols-2 gap-3 sm:gap-2">
                  <div>
                    <Input
                      id="inventoryMin"
                      name="inventoryMin"
                      type="number"
                      placeholder="Min units"
                      defaultValue={currentFilters.inventoryMin}
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      id="inventoryMax"
                      name="inventoryMax"
                      type="number"
                      placeholder="Max units"
                      defaultValue={currentFilters.inventoryMax}
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-base sm:text-sm">
                  Category
                </Label>
                <Select
                  name="category"
                  defaultValue={currentFilters.category || 'all'}
                >
                  <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="all"
                      className="text-base sm:text-sm py-3 sm:py-2"
                    >
                      All categories
                    </SelectItem>
                    {/* Dynamically render categories from API */}
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id}
                        className="text-base sm:text-sm py-3 sm:py-2"
                        style={{
                          paddingLeft: `${0.75 + category.level * 1}rem`,
                        }}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-base sm:text-sm">
                  Status
                </Label>
                <Select
                  name="status"
                  defaultValue={currentFilters.status || 'all'}
                >
                  <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="all"
                      className="text-base sm:text-sm py-3 sm:py-2"
                    >
                      All statuses
                    </SelectItem>
                    <SelectItem
                      value="ACTIVE"
                      className="text-base sm:text-sm py-3 sm:py-2"
                    >
                      Active
                    </SelectItem>
                    <SelectItem
                      value="INACTIVE"
                      className="text-base sm:text-sm py-3 sm:py-2"
                    >
                      Inactive
                    </SelectItem>
                    <SelectItem
                      value="DISCONTINUED"
                      className="text-base sm:text-sm py-3 sm:py-2"
                    >
                      Discontinued
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sticky Footer with Actions - Mobile Optimized */}
            <SheetFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4 mt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={clearAllFilters}
                className="w-full sm:flex-1 h-11 sm:h-10 text-base sm:text-sm order-2 sm:order-1"
              >
                Clear All
              </Button>
              <Button
                type="submit"
                className="w-full sm:flex-1 h-11 sm:h-10 text-base sm:text-sm order-1 sm:order-2"
              >
                Apply Filters
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Active Filter Badges - Mobile Optimized */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentFilters.priceMin && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Price ≥ ${currentFilters.priceMin}
              <button
                type="button"
                onClick={() => removeFilter('priceMin')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove minimum price filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentFilters.priceMax && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Price ≤ ${currentFilters.priceMax}
              <button
                type="button"
                onClick={() => removeFilter('priceMax')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove maximum price filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentFilters.inventoryMin && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Stock ≥ {currentFilters.inventoryMin}
              <button
                type="button"
                onClick={() => removeFilter('inventoryMin')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove minimum inventory filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentFilters.inventoryMax && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Stock ≤ {currentFilters.inventoryMax}
              <button
                type="button"
                onClick={() => removeFilter('inventoryMax')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove maximum inventory filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentFilters.status && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Status: {currentFilters.status}
              <button
                type="button"
                onClick={() => removeFilter('status')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentFilters.category && (
            <Badge
              variant="secondary"
              className="gap-1 h-8 sm:h-7 px-2.5 sm:px-2 text-sm"
            >
              Category: {getCategoryName(currentFilters.category)}
              <button
                type="button"
                onClick={() => removeFilter('category')}
                className="hover:bg-secondary-foreground/20 rounded-full p-0.5 touch-manipulation"
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
