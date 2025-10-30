'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@repo/ui'

import { api } from '~/utils/api'
import { toast } from 'sonner'

/**
 * InventoryAdjustmentDialog
 *
 * Modal for adjusting product inventory with audit trail.
 *
 * Supports two adjustment types:
 * - SET: Set inventory to specific value
 * - ADJUST: Add/subtract from current inventory
 *
 * Features:
 * - Current inventory display
 * - New total preview
 * - Reason field for audit trail
 * - Validation (no negative inventory)
 */

const adjustmentSchema = z.object({
  type: z.enum(['SET', 'ADJUST']),
  value: z.number().int(),
  reason: z.string().min(1, 'Reason is required').max(200),
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

interface InventoryAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  currentInventory: number
  onSuccess: () => void
}

export function InventoryAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentInventory,
  onSuccess,
}: InventoryAdjustmentDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: 'ADJUST',
      value: 0,
      reason: '',
    },
  })

  const utils = api.useUtils()

  const adjustMutation = api.admin.products.adjustInventory.useMutation({
    onSuccess: () => {
      toast.success('Inventory updated')
      onSuccess()
      void utils.admin.products.list.invalidate()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(`Failed to update inventory: ${error.message}`)
    },
  })

  const adjustmentType = watch('type')
  const adjustmentValue = watch('value')

  // Calculate new inventory
  const getNewInventory = () => {
    if (adjustmentType === 'SET') {
      return adjustmentValue
    } else {
      return currentInventory + adjustmentValue
    }
  }

  const newInventory = getNewInventory()
  const isValid = newInventory >= 0

  const onSubmit = (data: AdjustmentFormData) => {
    if (!isValid) {
      toast.error('New inventory cannot be negative')
      return
    }

    adjustMutation.mutate({
      productId,
      type: data.type,
      value: data.value,
      reason: data.reason,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
            <DialogDescription>
              Update inventory for: <strong>{productName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Inventory Display */}
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-600">Current Inventory</p>
              <p className="text-2xl font-bold">{currentInventory} units</p>
            </div>

            {/* Adjustment Type */}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <RadioGroup
                value={adjustmentType}
                onValueChange={(value) =>
                  setValue('type', value as 'SET' | 'ADJUST')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SET" id="set" />
                  <Label htmlFor="set" className="font-normal">
                    Set to specific value
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ADJUST" id="adjust" />
                  <Label htmlFor="adjust" className="font-normal">
                    Adjust (+/-) from current
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label htmlFor="value">
                {adjustmentType === 'SET'
                  ? 'New Inventory'
                  : 'Adjustment Amount'}
              </Label>
              <Input
                id="value"
                type="number"
                {...register('value', { valueAsNumber: true })}
                placeholder={
                  adjustmentType === 'SET' ? 'e.g., 100' : 'e.g., +20 or -5'
                }
              />
              {errors.value && (
                <p className="text-sm text-red-500">{errors.value.message}</p>
              )}
            </div>

            {/* New Total Preview */}
            <div
              className={`rounded-md p-3 ${
                isValid ? 'bg-blue-50' : 'bg-red-50'
              }`}
            >
              <p className="text-sm text-gray-600">New Total</p>
              <p
                className={`text-2xl font-bold ${
                  isValid ? 'text-blue-900' : 'text-red-600'
                }`}
              >
                {newInventory} units
                {!isValid && ' (Invalid - cannot be negative)'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {adjustmentType === 'SET'
                  ? `Change: ${newInventory - currentInventory > 0 ? '+' : ''}${
                      newInventory - currentInventory
                    }`
                  : `From ${currentInventory} to ${newInventory}`}
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="e.g., Received shipment #1234, Damaged units removed, Stock count correction"
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Reason will be logged in audit trail
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjustMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={adjustMutation.isPending || !isValid}
            >
              {adjustMutation.isPending ? 'Updating...' : 'Update Inventory'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
