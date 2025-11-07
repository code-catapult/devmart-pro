'use client'

import { useState } from 'react'
import { api } from '@/utils/api'
import { toast } from 'sonner'
import {
  Alert,
  AlertDescription,
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
import { AlertTriangle, Loader2 } from 'lucide-react'
import { OrderStatus } from '@repo/shared/types'

// State machine: defines valid status transitions
// This prevents invalid operations like DELIVERED -> PENDING
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [], // Terminal state - no further transitions
  CANCELLED: [], // Terminal state - no further transitions
}

// Risky transitions that require explicit warning
// Example: Cancelling a SHIPPED order may require shipping carrier coordination
const RISKY_TRANSITIONS: Record<string, string> = {
  'SHIPPED->CANCELLED':
    'Warning: This order has already been shipped. Cancelling may require coordinating with the shipping carrier and processing a return.',
  'PROCESSING->CANCELLED':
    'Warning: This order is being prepared. Cancelling now may waste inventory allocation.',
  'DELIVERED->CANCELLED':
    'Warning: This order was already delivered. Consider processing a refund instead.',
}

interface StatusUpdateDialogProps {
  orderId: string
  currentStatus: OrderStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function StatusUpdateDialog({
  orderId,
  currentStatus,
  open,
  onOpenChange,
  onSuccess,
}: StatusUpdateDialogProps) {
  // Local state for the selected new status
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Get the list of valid statuses based on current state
  const validStatuses = VALID_TRANSITIONS[currentStatus] || []

  // Check if the selected transition is risky
  const warningMessage = selectedStatus
    ? RISKY_TRANSITIONS[`${currentStatus}->${selectedStatus}`]
    : null

  // tRPC utilities for cache management
  const utils = api.useUtils()

  // Mutation for updating order status
  const updateStatusMutation = api.admin.orders.updateOrderStatus.useMutation({
    // Optimistic update: immediately update UI before server responds
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await utils.admin.orders.getOrderById.cancel({ id: orderId })

      // Snapshot the previous value for rollback
      const previousOrder = utils.admin.orders.getOrderById.getData({
        id: orderId,
      })

      // Optimistically update to the new status
      utils.admin.orders.getOrderById.setData({ id: orderId }, (old) =>
        old ? { ...old, status: variables.status } : undefined
      )

      // Return context with the previous value
      return { previousOrder }
    },

    // On error, rollback to the previous value
    onError: (_err, _variables, context) => {
      if (context?.previousOrder) {
        utils.admin.orders.getOrderById.setData(
          { id: orderId },
          context.previousOrder
        )
      }
    },

    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      void utils.admin.orders.getOrderById.invalidate({ id: orderId })
      void utils.admin.orders.getOrderTimeline.invalidate({ orderId })
      void utils.admin.orders.getOrders.invalidate()
      void utils.admin.dashboard.getDashboardMetrics.invalidate()
      void utils.admin.dashboard.getRecentOrders.invalidate()
    },

    onSuccess: () => {
      toast.success('Order status updated successfully', {
        description: `Order #${orderId.slice(0, 8)} is now ${selectedStatus}`,
      })
      // Close dialog and reset selection
      onOpenChange(false)
      setSelectedStatus('')
      onSuccess?.()
    },
  })

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedStatus) return

    updateStatusMutation.mutate({
      orderId,
      status: selectedStatus as OrderStatus,
    })
  }

  // Reset selection when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status of order #{orderId.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Status Display */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">
              Current Status:
            </label>
            <div className="col-span-3">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                {currentStatus}
              </span>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="status" className="text-right text-sm font-medium">
              New Status:
            </label>
            <div className="col-span-3">
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={
                  validStatuses.length === 0 || updateStatusMutation.isPending
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {validStatuses.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No valid transitions
                    </SelectItem>
                  ) : (
                    validStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warning Alert for Risky Transitions */}
          {warningMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{warningMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {updateStatusMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateStatusMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* No Valid Transitions Message */}
          {validStatuses.length === 0 && (
            <Alert>
              <AlertDescription>
                This order is in a terminal state ({currentStatus}). No further
                status changes are allowed.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateStatusMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !selectedStatus ||
              updateStatusMutation.isPending ||
              validStatuses.length === 0
            }
          >
            {updateStatusMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
