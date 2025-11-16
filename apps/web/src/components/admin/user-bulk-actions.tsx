'use client'

import { useState } from 'react'
import { api } from '~/utils/api'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui'

import {
  UserCog,
  UserX,
  UserCheck,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * UserBulkActions Component
 *
 * Displays bulk action toolbar when users are selected.
 * Provides actions for role changes, suspension, activation, and export.
 *
 * Features:
 * - Selection count display
 * - Role change with admin validation
 * - Bulk suspension with reason
 * - Bulk activation
 * - CSV/Excel export
 * - Confirmation dialogs for destructive actions
 * - Optimistic UI updates
 * - Mobile-optimized layout
 */

interface UserBulkActionsProps {
  selectedUserIds: Set<string>
  onClearSelection: () => void
  onActionComplete: () => void
}

type SuspensionReason = 'FRAUD' | 'ABUSE' | 'PAYMENT_ISSUES' | 'OTHER'

// Type for the query input - we'll use empty object since tRPC requires it
type GetUsersInput = Record<string, never>

export function UserBulkActions({
  selectedUserIds,
  onClearSelection,
  onActionComplete,
}: UserBulkActionsProps) {
  const utils = api.useUtils()

  // Dialog states
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)

  // Form states
  const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN'>('USER')
  const [suspensionReason, setSuspensionReason] =
    useState<SuspensionReason>('OTHER')
  const [suspensionNotes, setSuspensionNotes] = useState('')

  const selectedCount = selectedUserIds.size
  const userIdsArray = Array.from(selectedUserIds)

  // Mutations
  const bulkUpdateRoles =
    api.admin.userManagement.bulkUpdateUserRoles.useMutation({
      onMutate: async () => {
        // Optimistic update
        await utils.admin.userManagement.getUsers.cancel()
        const previousData = utils.admin.userManagement.getUsers.getData()

        utils.admin.userManagement.getUsers.setData(
          {} as GetUsersInput,
          (old) => {
            if (!old) return old
            return {
              ...old,
              users: old.users.map((user) =>
                selectedUserIds.has(user.id)
                  ? { ...user, role: selectedRole }
                  : user
              ),
            }
          }
        )

        return { previousData }
      },
      onError: (error, _variables, context) => {
        utils.admin.userManagement.getUsers.setData(
          {} as GetUsersInput,
          context?.previousData
        )
        toast.error(`Role update failed: ${error.message}`)
      },
      onSuccess: (data) => {
        toast.success(data.message)
        setShowRoleDialog(false)
        onClearSelection()
        onActionComplete()
      },
      onSettled: () => {
        void utils.admin.userManagement.getUsers.invalidate()
      },
    })

  const bulkSuspend = api.admin.userManagement.bulkSuspendUsers.useMutation({
    onMutate: async () => {
      await utils.admin.userManagement.getUsers.cancel()
      const previousData = utils.admin.userManagement.getUsers.getData()

      utils.admin.userManagement.getUsers.setData(
        {} as GetUsersInput,
        (old) => {
          if (!old) return old
          return {
            ...old,
            users: old.users.map((user) =>
              selectedUserIds.has(user.id)
                ? { ...user, suspended: true, suspendedAt: new Date() }
                : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (error, _variables, context) => {
      utils.admin.userManagement.getUsers.setData(
        {} as GetUsersInput,
        context?.previousData
      )
      toast.error(`Suspension failed: ${error.message}`)
    },
    onSuccess: (data) => {
      toast.success(data.message)
      setShowSuspendDialog(false)
      setSuspensionNotes('')
      onClearSelection()
      onActionComplete()
    },
    onSettled: () => {
      void utils.admin.userManagement.getUsers.invalidate()
    },
  })

  const bulkActivate = api.admin.userManagement.bulkActivateUsers.useMutation({
    onMutate: async () => {
      await utils.admin.userManagement.getUsers.cancel()
      const previousData = utils.admin.userManagement.getUsers.getData()

      utils.admin.userManagement.getUsers.setData(
        {} as GetUsersInput,
        (old) => {
          if (!old) return old
          return {
            ...old,
            users: old.users.map((user) =>
              selectedUserIds.has(user.id)
                ? { ...user, suspended: false, suspendedAt: null }
                : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (error, _variables, context) => {
      utils.admin.userManagement.getUsers.setData(
        {} as GetUsersInput,
        context?.previousData
      )
      toast.error(`Activation failed: ${error.message}`)
    },
    onSuccess: (data) => {
      toast.success(data.message)
      setShowActivateDialog(false)
      onClearSelection()
      onActionComplete()
    },
    onSettled: () => {
      void utils.admin.userManagement.getUsers.invalidate()
    },
  })

  const { refetch: fetchExportData } =
    api.admin.userManagement.bulkExportUsers.useQuery(
      { userIds: userIdsArray },
      { enabled: false } // Don't auto-fetch, only when export button clicked
    )

  // Handlers
  const handleRoleChange = () => {
    bulkUpdateRoles.mutate({
      userIds: userIdsArray,
      newRole: selectedRole,
    })
  }

  const handleSuspend = () => {
    bulkSuspend.mutate({
      userIds: userIdsArray,
      reason: suspensionReason,
      notes: suspensionNotes || undefined,
    })
  }

  const handleActivate = () => {
    bulkActivate.mutate({
      userIds: userIdsArray,
    })
  }

  const handleExport = async () => {
    toast.loading('Preparing export...', { id: 'bulk-export' })

    const result = await fetchExportData()

    if (!result.data) {
      toast.error('Export failed', { id: 'bulk-export' })
      return
    }

    // Generate CSV
    const csvContent = [
      // Header
      [
        'ID',
        'Name',
        'Email',
        'Role',
        'Status',
        'Order Count',
        'Total Spent',
        'Joined Date',
      ],
      // Data rows
      ...result.data.map((user) => [
        user.id,
        user.name,
        user.email,
        user.role,
        user.status,
        user.orderCount.toString(),
        `$${(user.totalSpent / 100).toFixed(2)}`,
        new Date(user.joinedDate).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${result.data.length} users`, {
      id: 'bulk-export',
    })
  }

  // Don't show toolbar if no users selected
  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      {/* Bulk Actions Toolbar */}
      <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {selectedCount}
            </div>
            <span className="text-sm md:text-base font-medium text-blue-900">
              {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="ml-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear selection</span>
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Change Role */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleDialog(true)}
              className="flex-1 sm:flex-none min-h-[44px]"
            >
              <UserCog className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Change Role</span>
              <span className="sm:hidden">Role</span>
            </Button>

            {/* Suspend */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuspendDialog(true)}
              className="flex-1 sm:flex-none min-h-[44px]"
            >
              <UserX className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Suspend</span>
              <span className="sm:hidden">Suspend</span>
            </Button>

            {/* Activate */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActivateDialog(true)}
              className="flex-1 sm:flex-none min-h-[44px]"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Activate</span>
              <span className="sm:hidden">Activate</span>
            </Button>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex-1 sm:flex-none min-h-[44px]"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Roles</DialogTitle>
            <DialogDescription>
              Change the role for {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">New Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as 'USER' | 'ADMIN')
                }
              >
                <SelectTrigger id="role-select" className="w-full min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'ADMIN' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Promoting to Admin</p>
                    <p>
                      Admin users have full access to all system features,
                      including user management and sensitive data.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={bulkUpdateRoles.isPending}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {bulkUpdateRoles.isPending
                ? 'Updating...'
                : `Change to ${selectedRole}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend User Accounts</DialogTitle>
            <DialogDescription>
              Suspend {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}. They will be logged out and
              unable to access the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspension-reason">Reason for Suspension</Label>
              <Select
                value={suspensionReason}
                onValueChange={(value) =>
                  setSuspensionReason(value as SuspensionReason)
                }
              >
                <SelectTrigger
                  id="suspension-reason"
                  className="w-full min-h-[44px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRAUD">Fraud</SelectItem>
                  <SelectItem value="ABUSE">Abuse / Violation</SelectItem>
                  <SelectItem value="PAYMENT_ISSUES">Payment Issues</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspension-notes">Notes (Optional)</Label>
              <Textarea
                id="suspension-notes"
                placeholder="Add any additional details about the suspension..."
                value={suspensionNotes}
                onChange={(e) => setSuspensionNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">
                    Warning: Destructive Action
                  </p>
                  <p>
                    Suspended users will be immediately logged out and cannot
                    log back in until their accounts are reactivated.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={bulkSuspend.isPending}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {bulkSuspend.isPending
                ? 'Suspending...'
                : `Suspend ${selectedCount} User${
                    selectedCount !== 1 ? 's' : ''
                  }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Activate User Accounts</DialogTitle>
            <DialogDescription>
              Reactivate {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}. They will be able to log in and
              access the platform again.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex gap-2">
                <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Reactivating Accounts</p>
                  <p>
                    Users will regain full access to their accounts and receive
                    a notification email.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowActivateDialog(false)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={bulkActivate.isPending}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {bulkActivate.isPending
                ? 'Activating...'
                : `Activate ${selectedCount} User${
                    selectedCount !== 1 ? 's' : ''
                  }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
