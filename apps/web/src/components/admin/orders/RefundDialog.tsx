'use client'

import { useState } from 'react'
import { api } from '@/utils/api'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@repo/ui'

import { AlertTriangle, DollarSign, Loader2, Info } from 'lucide-react'
import { formatCurrency } from '@repo/shared/utils'

interface RefundDialogProps {
  orderId: string
  orderTotal: number
  refundedAmount: number // Amount already refunded
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RefundDialog({
  orderId,
  orderTotal,
  refundedAmount,
  open,
  onOpenChange,
  onSuccess,
}: RefundDialogProps) {
  // Form state
  const [refundAmount, setRefundAmount] = useState('')
  const [reason, setReason] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Calculate the maximum refundable amount (in cents)
  const maxRefundableAmountCents = orderTotal - refundedAmount
  // Convert to dollars for display
  const maxRefundableAmountDollars = maxRefundableAmountCents / 100

  // Validate the refund amount (user enters in dollars)
  const parsedAmountDollars = parseFloat(refundAmount)
  const isValidAmount =
    !isNaN(parsedAmountDollars) &&
    parsedAmountDollars > 0 &&
    parsedAmountDollars <= maxRefundableAmountDollars

  // tRPC utilities for cache management
  const utils = api.useUtils()

  // Mutation for processing refund
  const refundMutation = api.admin.orders.processRefund.useMutation({
    onSuccess: () => {
      // Invalidate order queries to fetch updated data
      void utils.admin.orders.getOrderById.invalidate({ id: orderId })
      void utils.admin.orders.getOrders.invalidate()

      // Reset form state
      setRefundAmount('')
      setReason('')
      setShowConfirmation(false)

      // Close dialog
      onOpenChange(false)

      // Call success callback
      onSuccess?.()
    },
    onError: (_error) => {
      // Error is displayed in the dialog, no need to close
      // This allows user to see the error and potentially retry
      setShowConfirmation(false)
    },
  })

  // Handle the initial refund request (show confirmation)
  const handleRefundRequest = () => {
    if (!isValidAmount) return
    setShowConfirmation(true)
  }

  // Handle the confirmed refund (actually process it)
  const handleConfirmRefund = () => {
    if (!isValidAmount) return

    refundMutation.mutate({
      orderId,
      amount: parsedAmountDollars * 100, // Convert dollars to cents for API
      reason: 'OTHER',
      notes: reason.trim() || 'Refund requested by admin',
    })
  }

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !refundMutation.isPending) {
      // Reset all state when closing
      setRefundAmount('')
      setReason('')
      setShowConfirmation(false)
      refundMutation.reset()
    }
    onOpenChange(newOpen)
  }

  // Handle cancel (go back to form from confirmation)
  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
  }

  // Determine if this is a full refund
  const isFullRefund =
    isValidAmount && parsedAmountDollars === maxRefundableAmountDollars

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Confirm Refund' : 'Process Refund'}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? 'Please confirm the refund details below'
              : `Refund order #${orderId.slice(0, 8)}`}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          // Refund Form
          <div className="grid gap-4 py-4">
            {/* Order Total Information */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Order Information</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Original Total:</span>
                    <span className="font-medium">
                      {formatCurrency(orderTotal)}
                    </span>
                  </div>
                  {refundedAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Already Refunded:</span>
                      <span className="font-medium">
                        -{formatCurrency(refundedAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span>Max Refundable:</span>
                    <span className="font-medium">
                      {formatCurrency(maxRefundableAmountCents)}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Refund Amount Input */}
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="refund-amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={maxRefundableAmountDollars}
                  disabled={refundMutation.isPending}
                />
              </div>
              {refundAmount && !isValidAmount && (
                <p className="text-sm text-red-600">
                  {parsedAmountDollars <= 0
                    ? 'Amount must be greater than $0.00'
                    : `Amount cannot exceed ${formatCurrency(
                        maxRefundableAmountCents
                      )}`}
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRefundAmount((maxRefundableAmountDollars / 2).toFixed(2))
                }
                disabled={
                  refundMutation.isPending || maxRefundableAmountCents <= 0
                }
              >
                Half
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRefundAmount(maxRefundableAmountDollars.toFixed(2))
                }
                disabled={
                  refundMutation.isPending || maxRefundableAmountCents <= 0
                }
              >
                Full Refund
              </Button>
            </div>

            {/* Reason Input */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this refund is being processed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={refundMutation.isPending}
              />
              <p className="text-xs text-gray-500">
                This reason will be saved in the audit log
              </p>
            </div>

            {/* No Refund Available Warning */}
            {maxRefundableAmountCents <= 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This order has already been fully refunded. No additional
                  refund is possible.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Confirmation Step
          <div className="grid gap-4 py-4">
            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This action cannot be undone</AlertTitle>
              <AlertDescription>
                A refund of {formatCurrency(parsedAmountDollars * 100)} will be
                immediately processed through Stripe and credited back to the
                customer`&apos;`s payment method.
              </AlertDescription>
            </Alert>

            {/* Confirmation Details */}
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Refund Amount:</span>
                <span className="font-semibold">
                  {formatCurrency(parsedAmountDollars * 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Refund Type:</span>
                <span className="font-medium">
                  {isFullRefund ? 'Full Refund' : 'Partial Refund'}
                </span>
              </div>
              {reason && (
                <div className="border-t pt-3">
                  <span className="text-sm text-gray-500">Reason:</span>
                  <p className="mt-1 text-sm">{reason}</p>
                </div>
              )}
            </div>

            {/* Error Display */}
            {refundMutation.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Refund Failed</AlertTitle>
                <AlertDescription>
                  {refundMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {!showConfirmation ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={refundMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRefundRequest}
                disabled={
                  !isValidAmount ||
                  refundMutation.isPending ||
                  maxRefundableAmountCents <= 0
                }
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelConfirmation}
                disabled={refundMutation.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmRefund}
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Refund...
                  </>
                ) : (
                  `Refund ${formatCurrency(parsedAmountDollars * 100)}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
