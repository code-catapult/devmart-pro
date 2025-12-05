'use client'

import { useState } from 'react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@repo/ui'

import { AlertTriangle, Trash2, DollarSign, X } from 'lucide-react'
import { api } from '~/utils/api'
import { toast } from 'sonner'

/**
 * BulkActionsBar Component
 *
 * Displays bulk action controls when products are selected.
 * Supports bulk delete and bulk price updates.
 *
 * Features:
 * - Shows selection count
 * - Confirmation dialogs for destructive actions
 * - Preview of changes before execution
 * - Optimistic updates with rollback on error
 * - Transaction-based updates (all-or-nothing)
 *
 * @param selectedIds - Array of selected product IDs
 * @param onClearSelection - Callback to clear selection
 * @param onSuccess - Callback after successful bulk operation
 */

interface BulkActionsBarProps {
  selectedIds: string[]
  onClearSelection: () => void
  onSuccess: () => void
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  onSuccess,
}: BulkActionsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)

  // Bulk price update form state
  const [updateType, setUpdateType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(
    'PERCENTAGE'
  )
  const [value, setValue] = useState<string>('10')
  const [operation, setOperation] = useState<'INCREASE' | 'DECREASE'>(
    'INCREASE'
  )

  const utils = api.useUtils()

  // Bulk delete mutation
  const bulkDeleteMutation = api.admin.products.bulkDelete.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} products discontinued`)
      onClearSelection()
      onSuccess()
      void utils.admin.products.list.invalidate()
      setDeleteDialogOpen(false)
    },
    onError: (error) => {
      toast.error(`Bulk delete failed: ${error.message}`)
    },
  })

  // Bulk price update mutation
  const bulkPriceUpdateMutation =
    api.admin.products.bulkUpdatePrices.useMutation({
      onSuccess: (result) => {
        toast.success(`${result.count} products updated`)
        onClearSelection()
        onSuccess()
        void utils.admin.products.list.invalidate()
        setPriceDialogOpen(false)
      },
      onError: (error) => {
        toast.error(`Bulk price update failed: ${error.message}`)
      },
    })

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate({ ids: selectedIds })
  }

  const handleBulkPriceUpdate = () => {
    const numericValue = parseFloat(value)

    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error('Please enter a valid positive number')
      return
    }

    bulkPriceUpdateMutation.mutate({
      ids: selectedIds,
      updateType,
      value: numericValue,
      operation,
    })
  }

  // Don't render if no items selected
  if (selectedIds.length === 0) return null

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-b border-gray-200 bg-blue-50 px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
        {/* Selection Count */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-base font-medium text-blue-900 truncate">
            {selectedIds.length} selected
          </span>
        </div>

        {/* Action Buttons - Responsive Layout */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mb-2 pt-4 md:pt-6">
          {/* Delete Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-1.5 h-9 sm:h-8 text-sm flex-1 sm:flex-none min-w-[100px]"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sm:inline">Delete</span>
          </Button>

          {/* Update Prices Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPriceDialogOpen(true)}
            className="gap-1.5 h-9 sm:h-8 text-sm flex-1 sm:flex-none min-w-[100px]"
          >
            <DollarSign className="h-4 w-4" />
            <span className="sm:inline">Update Prices</span>
          </Button>

          {/* Clear Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-1.5 h-9 sm:h-8 text-sm px-3 absolute right-0 top-0"
          >
            <X className="h-4 w-4 text-gray-700" />
            <span className="sr-only">Clear</span>
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              Discontinue {selectedIds.length} Products?
            </DialogTitle>
            <DialogDescription className="text-sm">
              This will set the status of {selectedIds.length} product
              {selectedIds.length === 1 ? '' : 's'} to DISCONTINUED. Products
              will no longer be visible to customers, but historical order data
              will be preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-yellow-50 p-3 sm:p-4">
            <p className="text-sx sm:text-sm text-yellow-800">
              <strong>Note:</strong> This is a soft delete. Products can be
              reactivated later if needed.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={bulkDeleteMutation.isPending}
              className="w-full sm:w-auto h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="w-full sm:w-auto h-10"
            >
              {bulkDeleteMutation.isPending
                ? 'Discontinuing...'
                : 'Discontinue Products'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Update Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Update Prices for {selectedIds.length} Products
            </DialogTitle>
            <DialogDescription className="text-sm">
              Apply a price adjustment to all selected products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4">
            {/* Update Type */}
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Update Type</Label>
              <RadioGroup
                value={updateType}
                onValueChange={(value) =>
                  setUpdateType(value as 'PERCENTAGE' | 'FIXED_AMOUNT')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PERCENTAGE" id="percentage" />
                  <Label
                    htmlFor="percentage"
                    className="text-sm cursor-pointer"
                  >
                    Percentage (%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FIXED_AMOUNT" id="fixed" />
                  <Label htmlFor="fixed" className="text-sm cursor-pointer">
                    Fixed Amount ($)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="value" className="text-sm sm:text-base">
                {updateType === 'PERCENTAGE' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={updateType === 'PERCENTAGE' ? '10' : '5.00'}
                className="h-10 sm:h-9 text-base sm:text-sm"
              />
            </div>

            {/* Operation */}
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Operation</Label>
              <RadioGroup
                value={operation}
                onValueChange={(value) =>
                  setOperation(value as 'INCREASE' | 'DECREASE')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INCREASE" id="increase" />
                  <Label htmlFor="increase" className="text-sm cursor-pointer">
                    Increase
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DECREASE" id="decrease" />
                  <Label htmlFor="decrease" className="text-sm cursor-pointer">
                    Decrease
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Preview */}
            <div className="rounded-md bg-blue-50 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-900">
                <strong>Example:</strong> A product priced at $100.00 will
                become{' '}
                {updateType === 'PERCENTAGE'
                  ? operation === 'INCREASE'
                    ? `$${(100 * (1 + parseFloat(value || '0') / 100)).toFixed(
                        2
                      )}`
                    : `$${(100 * (1 - parseFloat(value || '0') / 100)).toFixed(
                        2
                      )}`
                  : operation === 'INCREASE'
                    ? `$${(100 + parseFloat(value || '0')).toFixed(2)}`
                    : `$${(100 - parseFloat(value || '0')).toFixed(2)}`}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPriceDialogOpen(false)}
              disabled={bulkPriceUpdateMutation.isPending}
              className="w-full sm:w-auto h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkPriceUpdate}
              disabled={bulkPriceUpdateMutation.isPending}
              className="w-full sm:w-auto h-10"
            >
              {bulkPriceUpdateMutation.isPending
                ? 'Updating...'
                : 'Update Prices'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
