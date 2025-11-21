'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { ArrowUpDown } from 'lucide-react'

/**
 * FilterBar Component
 *
 * Provides dropdowns for filtering and sorting the user list.
 *
 * FILTERS:
 * - Role: ALL / USER / ADMIN
 * - Status: ALL / ACTIVE / SUSPENDED
 * - Sort By: Name / Email / Created Date / Total Spent
 * - Sort Order: Ascending / Descending
 *
 * All selections are immediately reflected in the URL and trigger
 * a server-side re-render with the new filters applied.
 *
 * MOBILE OPTIMIZATION:
 * - Dropdowns stack vertically on mobile
 * - Touch-friendly selection UI from shadcn/ui
 * - Clear labels for accessibility
 */

interface FilterBarProps {
  roleFilter: 'ALL' | 'USER' | 'ADMIN'
  statusFilter: 'ALL' | 'ACTIVE' | 'SUSPENDED'
  sortBy: 'name' | 'email' | 'createdAt' | 'totalSpent'
  sortOrder: 'asc' | 'desc'
}

export function FilterBar({
  roleFilter,
  statusFilter,
  sortBy,
  sortOrder,
}: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ============================================
  // FILTER CHANGE HANDLER
  // ============================================

  /**
   * Generic function to update any filter in the URL.
   *
   * @param key - The URL parameter key (e.g., "role", "status", "sortBy")
   * @param value - The new value for that parameter
   *
   * Example: updateFilter("role", "ADMIN") creates URL:
   * /admin/users?role=ADMIN&page=1&...other params
   */
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Update or remove the parameter
    if (value === 'ALL') {
      params.delete(key) // Remove filter if "ALL" is selected
    } else {
      params.set(key, value)
    }

    // Reset to page 1 when filters change
    // (user might be on page 5 with old filters, which could be empty with new filters)
    params.set('page', '1')

    // Navigate to new URL
    router.push(`/admin/users?${params.toString()}`)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-2">
      {/* ============================================ */}
      {/* ROLE FILTER */}
      {/* ============================================ */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="role-filter"
          className="text-xs font-medium text-gray-700"
        >
          Role
        </label>
        <Select
          value={roleFilter}
          onValueChange={(value) => updateFilter('role', value)}
        >
          <SelectTrigger
            id="role-filter"
            className="w-full min-h-[44px] sm:w-[130px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ============================================ */}
      {/* STATUS FILTER */}
      {/* ============================================ */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="status-filter"
          className="text-xs font-medium text-gray-700"
        >
          Status
        </label>
        <Select
          value={statusFilter}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger
            id="status-filter"
            className="w-full min-h-[44px] sm:w-[140px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ============================================ */}
      {/* SORT BY FIELD */}
      {/* ============================================ */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sort-by-filter"
          className="text-xs font-medium text-gray-700"
        >
          Sort By
        </label>
        <Select
          value={sortBy}
          onValueChange={(value) => updateFilter('sortBy', value)}
        >
          <SelectTrigger
            id="sort-by-filter"
            className="w-full min-h-[44px] sm:w-[150px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Joined</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="totalSpent">Total Spent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ============================================ */}
      {/* SORT ORDER TOGGLE */}
      {/* ============================================ */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sort-order-toggle"
          className="text-xs font-medium text-gray-700"
        >
          Order
        </label>
        <button
          id="sort-order-toggle"
          type="button"
          onClick={() =>
            updateFilter('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
          }
          className="
            flex items-center justify-center gap-2
            rounded-lg border border-gray-300 bg-white
            px-4 py-2
            text-sm font-medium text-gray-700
            hover:bg-gray-50
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            min-h-[44px]
          "
          aria-label={`Sort ${
            sortOrder === 'asc' ? 'ascending' : 'descending'
          }, click to toggle`}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </span>
        </button>
      </div>
    </div>
  )
}
