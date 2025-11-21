'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Ban, CheckCircle, AlertTriangle } from 'lucide-react'
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
  Textarea,
} from '@repo/ui'

/**
 * SuspensionManager Component
 *
 * Manages account suspension and reactivation.
 *
 * FEATURES:
 * - Suspend/Activate toggle button
 * - Modal with reason selection and notes
 * - Predefined suspension reasons
 * - Session invalidation on suspension
 * - Optimistic UI with error recovery
 * - Audit logging
 *
 * SECURITY:
 * - Atomic transaction (user update + session delete)
 * - Immediate session invalidation
 * - Required reason documentation
 * - Activity logging for compliance
 */

interface SuspensionManagerProps {
  userId: string
  userName: string
  suspended: boolean
  suspensionReason: string | null
  suspensionNotes: string | null
  suspendedAt: Date | null
  onStatusChanged?: (suspended: boolean) => void
}

type SuspensionReason =
  | 'POLICY_VIOLATION'
  | 'FRAUD'
  | 'SPAM'
  | 'CHARGEBACKS'
  | 'SECURITY'
  | 'REQUESTED'
  | 'OTHER'

const SUSPENSION_REASONS: Record<SuspensionReason, string> = {
  POLICY_VIOLATION: 'Violated Terms of Service',
  FRAUD: 'Fraudulent activity detected',
  SPAM: 'Spam or abusive behavior',
  CHARGEBACKS: 'Multiple payment disputes',
  SECURITY: 'Account security concern',
  REQUESTED: 'User requested account closure',
  OTHER: 'Other (see notes)',
}

export function SuspensionManager({
  userId,
  userName,
  suspended: initialSuspended,
  suspensionReason,
  suspensionNotes,
  suspendedAt,
  onStatusChanged,
}: SuspensionManagerProps) {
  const [suspended, setSuspended] = useState(initialSuspended)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedReason, setSelectedReason] =
    useState<SuspensionReason>('POLICY_VIOLATION')
  const [notes, setNotes] = useState('')

  // ============================================
  // tRPC MUTATIONS
  // ============================================

  const suspendMutation = api.admin.userManagement.suspendUser.useMutation()
  const activateMutation = api.admin.userManagement.activateUser.useMutation()

  // ============================================
  // OPEN DIALOG
  // ============================================

  const openSuspensionDialog = () => {
    setSelectedReason('POLICY_VIOLATION')
    setNotes('')
    setShowDialog(true)
  }

  const openReactivationDialog = () => {
    setShowDialog(true)
  }

  // ============================================
  // SUSPEND ACCOUNT
  // ============================================

  const handleSuspend = async () => {
    const previousSuspended = suspended

    // Close dialog and update UI optimistically
    setShowDialog(false)
    setSuspended(true)

    try {
      await suspendMutation.mutateAsync({
        userId,
        reason: selectedReason,
        notes: notes.trim() || undefined,
      })

      onStatusChanged?.(true)
    } catch {
      // Revert optimistic update
      setSuspended(previousSuspended)
      alert('Failed to suspend account. Please try again.')
    }
  }

  // ============================================
  // REACTIVATE ACCOUNT
  // ============================================

  const handleReactivate = async () => {
    const previousSuspended = suspended

    // Close dialog and update UI optimistically
    setShowDialog(false)
    setSuspended(false)

    try {
      await activateMutation.mutateAsync({ userId })

      onStatusChanged?.(false)
    } catch {
      // Revert optimistic update
      setSuspended(previousSuspended)
      alert('Failed to reactivate account. Please try again.')
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* ============================================ */}
      {/* SUSPENSION STATUS & ACTIONS */}
      {/* ============================================ */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Display */}
          <div>
            <div className="flex items-center gap-2">
              {suspended ? (
                <Ban className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                Account Status
              </h3>
            </div>

            <div className="mt-2">
              <span
                className={`
                  inline-flex rounded-full px-3 py-1
                  text-sm font-semibold
                  ${
                    suspended
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }
                `}
              >
                {suspended ? 'Suspended' : 'Active'}
              </span>

              {suspended && suspendedAt && (
                <p className="mt-2 text-sm text-gray-600">
                  Suspended{' '}
                  {formatDistanceToNow(new Date(suspendedAt), {
                    addSuffix: true,
                  })}
                </p>
              )}
            </div>

            {/* Suspension Details */}
            {suspended && suspensionReason && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">
                  Reason:{' '}
                  {SUSPENSION_REASONS[suspensionReason as SuspensionReason] ||
                    suspensionReason}
                </p>
                {suspensionNotes && (
                  <p className="mt-1 text-sm text-red-700">{suspensionNotes}</p>
                )}
              </div>
            )}
          </div>

          {/* Suspend Action Button */}
          <div>
            {suspended ? (
              <Button
                onClick={openReactivationDialog}
                variant="outline"
                className="min-h-[44px]"
                disabled={
                  suspendMutation.isPending || activateMutation.isPending
                }
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Reactivate Account
              </Button>
            ) : (
              <Button
                onClick={openSuspensionDialog}
                variant="destructive"
                className="min-h-[44px]"
                disabled={
                  suspendMutation.isPending || activateMutation.isPending
                }
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspend Account
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUSPENSION DIALOG */}
      {/* ============================================ */}
      <Dialog open={showDialog && !suspended} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Suspend Account
            </DialogTitle>
            <DialogDescription>
              Suspend <span className="font-semibold">{userName}</span> from
              accessing the platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning Message */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">
                ⚠️ This action will:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                <li>• Log out all active sessions immediately</li>
                <li>• Prevent user from logging in</li>
                <li>• Block access to their account and orders</li>
                <li>• Be visible in audit logs</li>
              </ul>
            </div>

            {/* Reason Selection */}
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700"
              >
                Suspension Reason <span className="text-red-600">*</span>
              </label>
              <Select
                value={selectedReason}
                onValueChange={(value) =>
                  setSelectedReason(value as SuspensionReason)
                }
              >
                <SelectTrigger id="reason" className="mt-1 min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUSPENSION_REASONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes Field */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700"
              >
                Additional Notes{' '}
                <span className="text-gray-500">(Optional)</span>
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide additional context for this suspension (e.g., specific policy violated, ticket number, evidence)..."
                rows={4}
                className="mt-1"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {notes.length}/500 characters
              </p>
            </div>

            {/* Legal Notice */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-700">
                <span className="font-medium">Note:</span> This suspension will
                be logged in the activity log for compliance. Ensure you have
                documented evidence of the policy violation before suspending.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSuspend}
              className="min-h-[44px]"
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* REACTIVATION DIALOG */}
      {/* ============================================ */}
      <Dialog open={showDialog && suspended} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Reactivate Account
            </DialogTitle>
            <DialogDescription>
              Restore access for{' '}
              <span className="font-semibold">{userName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-700">
              This will immediately restore full account access for{' '}
              <span className="font-semibold">{userName}</span>. They will be
              able to:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>Log in to their account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>View and manage their orders</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>Make new purchases</span>
              </li>
            </ul>

            {/* Suspension History */}
            {suspensionReason && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-700">
                  Previous Suspension:
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {SUSPENSION_REASONS[suspensionReason as SuspensionReason] ||
                    suspensionReason}
                </p>
                {suspensionNotes && (
                  <p className="mt-1 text-xs text-gray-600">
                    {suspensionNotes}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReactivate}
              className="min-h-[44px]"
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending
                ? 'Reactivating...'
                : 'Reactivate Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
