'use client'

import { useState } from 'react'
import { UserListTableWithCheckboxes } from './UserListTableWithCheckboxes'
import { UserBulkActions } from '~/components/admin/user-bulk-actions'
import type { UserListItem, SortField, SortOrder } from '@repo/shared/types'

/**
 * UserListWithBulkActions Component
 *
 * Client wrapper that adds bulk selection functionality to the user list.
 * This component manages selection state and coordinates:
 * - Bulk actions toolbar (shows when items are selected)
 * - Table with checkboxes for selection
 *
 * ARCHITECTURE:
 * - Server Component (page.tsx) fetches data
 * - This Client Component manages selection state
 * - Child components handle rendering
 *
 * WHY THIS APPROACH:
 * - Keeps selection state isolated in client component
 * - Allows server component page to handle data fetching
 * - Maintains clean separation of concerns
 */

interface UserListWithBulkActionsProps {
  users: UserListItem[]
  currentSort: {
    field: SortField
    order: SortOrder
  }
  onRefetch?: () => void
}

export function UserListWithBulkActions({
  users,
  currentSort,
  onRefetch,
}: UserListWithBulkActionsProps) {
  // ============================================
  // SELECTION STATE
  // ============================================

  // Using Set for O(1) lookup operations when checking selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  /**
   * Toggle individual user selection
   *
   * IMPLEMENTATION NOTE:
   * - Create new Set to trigger React re-render
   * - Sets are reference types, so mutation won't trigger update
   */
  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    setSelectedUserIds(newSet)
  }

  /**
   * Toggle all users on current page
   * - If all selected → clear all
   * - If some/none selected → select all
   *
   * NOTE: Only selects users on current page, not all users in database
   */
  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      // All selected → clear all
      setSelectedUserIds(new Set())
    } else {
      // Some or none selected → select all
      setSelectedUserIds(new Set(users.map((u) => u.id)))
    }
  }

  /**
   * Clear all selections
   * Called by UserBulkActions after completing action
   */
  const clearSelection = () => {
    setSelectedUserIds(new Set())
  }

  // ============================================
  // DERIVED STATE
  // ============================================

  const isAllSelected =
    users.length > 0 && selectedUserIds.size === users.length
  const isSomeSelected = selectedUserIds.size > 0 && !isAllSelected

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar - Only shows when users are selected */}
      <UserBulkActions
        selectedUserIds={selectedUserIds}
        onClearSelection={clearSelection}
        onActionComplete={() => {
          // Refetch data after bulk action completes
          onRefetch?.()
        }}
      />

      {/* Table with Checkboxes */}
      <UserListTableWithCheckboxes
        users={users}
        currentSort={currentSort}
        selectedUserIds={selectedUserIds}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleUser={toggleUser}
        onToggleSelectAll={toggleSelectAll}
      />
    </div>
  )
}
