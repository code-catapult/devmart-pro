'use client'

import { useState } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { api } from '~/utils/api'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'

/**
 * RoleManager Component
 *
 * Manages user role changes with security safeguards.
 *
 * FEATURES:
 * - Dropdown for role selection
 * - Confirmation dialog with change preview
 * - Admin lockout prevention
 * - Optimistic UI updates
 * - Audit logging
 * - Error handling and recovery
 *
 * SECURITY:
 * - Server-side validation (cannot demote last admin)
 * - Confirmation required for all changes
 * - Activity logging for compliance
 * - Error recovery (revert optimistic update)
 */

interface RoleManagerProps {
  userId: string
  userName: string
  currentRole: 'USER' | 'ADMIN'
  onRoleChanged?: (newRole: 'USER' | 'ADMIN') => void
}

export function RoleManager({
  userId,
  userName,
  currentRole,
  onRoleChanged,
}: RoleManagerProps) {
  const [role, setRole] = useState<'USER' | 'ADMIN'>(currentRole)
  const [pendingRole, setPendingRole] = useState<'USER' | 'ADMIN' | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // ============================================
  // tRPC MUTATION
  // ============================================

  const updateRoleMutation =
    api.admin.userManagement.updateUserRole.useMutation()

  // ============================================
  // ROLE CHANGE HANDLER
  // ============================================

  /**
   * Called when user selects new role from dropdown.
   * Opens confirmation dialog instead of changing immediately.
   */
  const handleRoleSelect = (newRole: 'USER' | 'ADMIN') => {
    if (newRole === role) return // No change

    setPendingRole(newRole)
    setShowConfirmation(true)
  }

  // ============================================
  // CONFIRM ROLE CHANGE
  // ============================================

  /**
   * Called when user confirms role change in dialog.
   * Uses optimistic UI: update immediately, revert if fails.
   */
  const confirmRoleChange = async () => {
    if (!pendingRole) return

    const previousRole = role

    // Close dialog and update UI optimistically
    setShowConfirmation(false)
    setRole(pendingRole)
    setPendingRole(null)

    try {
      // Call server to persist change
      await updateRoleMutation.mutateAsync({
        userId,
        role: pendingRole,
      })

      // Notify parent component (if callback provided)
      onRoleChanged?.(pendingRole)
    } catch (error: unknown) {
      // Revert optimistic update on error
      setRole(previousRole)

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage.includes('last admin')) {
        alert(
          'Cannot demote this user. They are the last admin in the system. ' +
            'Promote another user to admin first.'
        )
      } else {
        alert('Failed to change role. Please try again.')
      }
    }
  }

  // ============================================
  // CANCEL CONFIRMATION
  // ============================================

  const cancelRoleChange = () => {
    setShowConfirmation(false)
    setPendingRole(null)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* ============================================ */}
      {/* ROLE SELECTOR */}
      {/* ============================================ */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-600" />
          <label
            htmlFor="role-select"
            className="text-sm font-medium text-gray-700"
          >
            Role:
          </label>
        </div>

        <Select value={role} onValueChange={handleRoleSelect}>
          <SelectTrigger
            id="role-select"
            className="w-[150px] min-h-[44px]"
            disabled={updateRoleMutation.isPending}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">
              <div className="flex flex-col items-start">
                <span className="font-medium">User</span>
                <span className="text-xs text-gray-600">Standard access</span>
              </div>
            </SelectItem>
            <SelectItem value="ADMIN">
              <div className="flex flex-col items-start">
                <span className="font-medium">Admin</span>
                <span className="text-xs text-gray-600">
                  Full system access
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Loading indicator */}
        {updateRoleMutation.isPending && (
          <div className="text-sm text-gray-600">Saving...</div>
        )}
      </div>

      {/* ============================================ */}
      {/* CONFIRMATION DIALOG */}
      {/* ============================================ */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Confirm Role Change
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm changing user role from {role} to {pendingRole}
            </DialogDescription>
          </DialogHeader>

          {/* ============================================ */}
          {/* CHANGE PREVIEW */}
          {/* ============================================ */}
          <div className="py-6">
            <p className="mb-4 text-sm text-gray-700">
              You are about to change the role for{' '}
              <span className="font-semibold">{userName}</span>:
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Current Role</p>
                  <p className="mt-1">
                    <span
                      className={`
                        inline-flex rounded-full px-3 py-1
                        text-sm font-semibold
                        ${
                          role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      `}
                    >
                      {role}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">New Role</p>
                  <p className="mt-1">
                    <span
                      className={`
                        inline-flex rounded-full px-3 py-1
                        text-sm font-semibold
                        ${
                          pendingRole === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      `}
                    >
                      {pendingRole}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* ROLE DESCRIPTIONS */}
            {/* ============================================ */}
            <div className="mt-4 space-y-3">
              {pendingRole === 'ADMIN' ? (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-sm font-medium text-purple-900">
                    Admin Access Granted
                  </p>
                  <p className="mt-2 text-sm text-purple-700">
                    This user will be able to:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-purple-700">
                    <li>• View and manage all users</li>
                    <li>• Change user roles (including promoting to admin)</li>
                    <li>• Suspend and activate accounts</li>
                    <li>• View support notes and activity logs</li>
                    <li>• Access all admin features</li>
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    Admin Access Revoked
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    This user will lose access to:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>• User management features</li>
                    <li>• Admin dashboard and analytics</li>
                    <li>• System configuration</li>
                    <li>• Support tools</li>
                  </ul>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    They will only have standard user access.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================ */}
          {/* DIALOG ACTIONS */}
          {/* ============================================ */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={cancelRoleChange}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRoleChange}
              className="min-h-[44px]"
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Changing...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
