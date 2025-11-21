'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { formatCurrency } from '@repo/shared/utils'
import { ArrowUp, ArrowDown, Mail, AlertCircle } from 'lucide-react'
import type { UserListItem, SortField, SortOrder } from '@repo/shared/types'
import { Route } from 'next'

/**
 * UserListTable Component
 *
 * Renders user list as a data table (≥ 768px).
 *
 * WHY TABLES ON DESKTOP:
 * - Large screens have space for columns
 * - Users can scan rows quickly for comparison
 * - Sortable columns allow data exploration
 * - Familiar pattern for admin interfaces
 *
 * FEATURES:
 * - Sortable columns (click header to toggle asc/desc)
 * - Visual sort indicators (arrows)
 * - Hover states for rows
 * - Color-coded badges for role/status
 * - Each row is clickable link to detail page
 * - Responsive column widths
 */

interface UserListTableProps {
  users: UserListItem[]
  currentSort: {
    field: SortField
    order: SortOrder
  }
}

export function UserListTable({ users, currentSort }: UserListTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ============================================
  // SORT HANDLER
  // ============================================

  /**
   * Handles column header clicks to toggle sorting.
   *
   * LOGIC:
   * - If clicking currently sorted column → toggle asc/desc
   * - If clicking different column → sort by that column, default to desc
   *
   * Example:
   * - Currently sorted by createdAt desc
   * - Click "Name" header → sort by name desc
   * - Click "Name" header again → sort by name asc
   * - Click "Email" header → sort by email desc
   */
  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    // If clicking current sort column, toggle order
    if (field === currentSort.field) {
      const newOrder = currentSort.order === 'asc' ? 'desc' : 'asc'
      params.set('sortOrder', newOrder)
    } else {
      // If clicking new column, use desc as default
      params.set('sortBy', field)
      params.set('sortOrder', 'desc')
    }

    router.push(`/admin/users?${params.toString()}`)
  }

  // ============================================
  // SORTABLE COLUMN HEADER COMPONENT
  // ============================================

  /**
   * Reusable component for column headers that support sorting.
   *
   * Shows arrow indicator if column is currently sorted.
   * Arrow points up for ascending, down for descending.
   */
  const SortableHeader = ({
    field,
    label,
  }: {
    field: SortField
    label: string
  }) => {
    const isActive = currentSort.field === field
    const isAscending = currentSort.order === 'asc'

    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="
          flex items-center gap-1.5
          font-semibold text-gray-700
          hover:text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded
          transition-colors
        "
      >
        {label}
        {isActive &&
          (isAscending ? (
            <ArrowUp className="h-4 w-4 text-blue-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-blue-600" />
          ))}
        {!isActive && (
          <div className="h-4 w-4 opacity-0 group-hover:opacity-30">
            <ArrowDown className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </button>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              <SortableHeader field="name" label="User" />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              <SortableHeader field="email" label="Email" />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              <SortableHeader field="totalSpent" label="Total Spent" />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Orders
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              <SortableHeader field="createdAt" label="Joined" />
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr
              key={user.id}
              className="
                group transition-colors
                hover:bg-gray-50
              "
            >
              <td className="whitespace-nowrap px-6 py-4">
                <Link
                  href={`/admin/users/${user.id}` as Route}
                  className="
                    flex items-center gap-3
                    font-medium text-gray-900
                    hover:text-blue-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded
                  "
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">
                    {user.name
                      ? user.name.charAt(0).toUpperCase()
                      : user.email.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name || 'No name'}</span>
                </Link>
              </td>

              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate max-w-[200px]">{user.email}</span>
                </div>
              </td>

              <td className="whitespace-nowrap px-6 py-4">
                <span
                  className={`
                    inline-flex rounded-full px-2.5 py-0.5
                    text-xs font-medium
                    ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {user.role}
                </span>
              </td>

              <td className="whitespace-nowrap px-6 py-4">
                {user.suspended ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700">Suspended</span>
                  </div>
                ) : (
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Active
                  </span>
                )}
              </td>

              <td className="whitespace-nowrap px-6 py-4 text-right">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(user.totalSpent)}
                </span>
              </td>

              <td className="whitespace-nowrap px-6 py-4 text-center">
                <span className="text-sm text-gray-900">{user.orderCount}</span>
              </td>

              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-gray-900">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
