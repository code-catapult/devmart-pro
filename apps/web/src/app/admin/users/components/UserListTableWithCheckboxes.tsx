'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { formatCurrency } from '@repo/shared/utils'
import { ArrowUp, ArrowDown, Mail, AlertCircle } from 'lucide-react'
import { Checkbox } from '@repo/ui'
import type { UserListItem, SortField, SortOrder } from '@repo/shared/types'
import { Route } from 'next'

/**
 * UserListTableWithCheckboxes Component
 *
 * Enhanced version of UserListTable that includes selection checkboxes.
 * Extends the base table with:
 * - Checkbox column for bulk selection
 * - Visual highlight for selected rows
 * - Select all functionality
 *
 * DIFFERENCE FROM UserListTable:
 * - UserListTable: Read-only table for viewing users
 * - This component: Interactive table with bulk selection
 *
 * REUSE STRATEGY:
 * - Keeps same design and layout as UserListTable
 * - Adds selection column as first column
 * - Highlights selected rows with blue background
 */

interface UserListTableWithCheckboxesProps {
  users: UserListItem[]
  currentSort: {
    field: SortField
    order: SortOrder
  }
  selectedUserIds: Set<string>
  isAllSelected: boolean
  isSomeSelected: boolean
  onToggleUser: (userId: string) => void
  onToggleSelectAll: () => void
}

export function UserListTableWithCheckboxes({
  users,
  currentSort,
  selectedUserIds,
  isAllSelected,
  isSomeSelected,
  onToggleUser,
  onToggleSelectAll,
}: UserListTableWithCheckboxesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ============================================
  // SORT HANDLER (same as UserListTable)
  // ============================================

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    if (field === currentSort.field) {
      const newOrder = currentSort.order === 'asc' ? 'desc' : 'asc'
      params.set('sortOrder', newOrder)
    } else {
      params.set('sortBy', field)
      params.set('sortOrder', 'desc')
    }

    router.push(`/admin/users?${params.toString()}`)
  }

  // ============================================
  // SORTABLE HEADER COMPONENT (same as UserListTable)
  // ============================================

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
            {/* SELECT ALL CHECKBOX COLUMN - NEW */}
            <th scope="col" className="w-12 px-4 py-3 text-left">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all users on this page"
                className="min-h-[16px] min-w-[16px]"
              />
              {isSomeSelected && (
                <span className="sr-only">
                  {selectedUserIds.size} user
                  {selectedUserIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </th>

            {/* ORIGINAL COLUMNS FROM UserListTable */}
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
          {users.map((user) => {
            const isSelected = selectedUserIds.has(user.id)

            return (
              <tr
                key={user.id}
                className={`
                  group transition-colors
                  hover:bg-gray-50
                  ${isSelected ? 'bg-blue-50' : ''}
                `}
              >
                {/* CHECKBOX COLUMN - NEW */}
                <td className="px-4 py-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleUser(user.id)}
                    aria-label={`Select ${user.name || user.email}`}
                    className="min-h-[16px] min-w-[16px]"
                  />
                </td>

                {/* ORIGINAL COLUMNS FROM UserListTable */}
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
                      <span className="font-medium text-red-700">
                        Suspended
                      </span>
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
                  <span className="text-sm text-gray-900">
                    {user.orderCount}
                  </span>
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
