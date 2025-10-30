'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Ban, AlertTriangle } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui'

import { api } from '~/utils/api'
import { toast } from 'sonner'
import { ProductStatus } from '@repo/shared/types'

/**
 * ProductStatusToggle
 *
 * Dropdown menu for changing product status with state machine validation.
 *
 * Status Rules:
 * - ACTIVE ↔ INACTIVE (reversible)
 * - ACTIVE/INACTIVE → DISCONTINUED (one-way)
 * - DISCONTINUED → X (cannot change)
 *
 * Features:
 * - Visual status badge
 * - Dropdown with valid transitions only
 * - Confirmation dialog for DISCONTINUED
 * - Disabled state for invalid transitions
 */

// type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'

interface ProductStatusToggleProps {
  productId: string
  currentStatus: ProductStatus
  productName: string
  onStatusChanged?: () => void
}

export function ProductStatusToggle({
  productId,
  currentStatus,
  productName,
  onStatusChanged,
}: ProductStatusToggleProps) {
  const [showDiscontinueConfirm, setShowDiscontinueConfirm] = useState(false)
  const utils = api.useUtils()

  const updateStatusMutation = api.admin.products.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Product ${data.status.toLowerCase()}`)
      void utils.admin.products.list.invalidate()
      onStatusChanged?.()
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`)
    },
  })

  const handleStatusChange = (newStatus: ProductStatus) => {
    if (newStatus === 'DISCONTINUED') {
      setShowDiscontinueConfirm(true)
      return
    }

    updateStatusMutation.mutate({
      productId,
      status: newStatus,
    })
  }

  const handleDiscontinueConfirm = () => {
    updateStatusMutation.mutate({
      productId,
      status: 'DISCONTINUED',
    })
    setShowDiscontinueConfirm(false)
  }

  // Status badge configuration
  const getStatusConfig = (status: ProductStatus) => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: CheckCircle2,
          label: 'Active',
          variant: 'success' as const,
          className: 'bg-green-100 text-green-800',
        }
      case 'INACTIVE':
        return {
          icon: XCircle,
          label: 'Inactive',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800',
        }
      case 'DISCONTINUED':
        return {
          icon: Ban,
          label: 'Discontinued',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800',
        }
    }
  }

  const statusConfig = getStatusConfig(currentStatus)
  const StatusIcon = statusConfig.icon

  // Determine valid transitions from current status
  const canActivate = currentStatus === 'INACTIVE'
  const canDeactivate = currentStatus === 'ACTIVE'
  const canDiscontinue = currentStatus !== 'DISCONTINUED'
  const isDiscontinued = currentStatus === 'DISCONTINUED'

  return (
    <>
      <TooltipProvider>
        {isDiscontinued ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block cursor-not-allowed">
                <Badge className={`gap-1 ${statusConfig.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                <div>
                  <p className="font-medium">Product is discontinued</p>
                  <p className="text-xs text-gray-400">
                    Status cannot be changed
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                disabled={updateStatusMutation.isPending}
              >
                <Badge className={`gap-1 ${statusConfig.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {canActivate && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Activate</p>
                    <p className="text-xs text-gray-500">
                      Make visible on storefront
                    </p>
                  </div>
                </DropdownMenuItem>
              )}

              {canDeactivate && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('INACTIVE')}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="font-medium">Deactivate</p>
                    <p className="text-xs text-gray-500">
                      Temporarily hide from sales
                    </p>
                  </div>
                </DropdownMenuItem>
              )}

              {canDiscontinue && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleStatusChange('DISCONTINUED')}
                    className="gap-2 text-red-600 focus:text-red-600"
                  >
                    <Ban className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Discontinue</p>
                      <p className="text-xs text-gray-500">
                        Permanently remove (cannot undo)
                      </p>
                    </div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TooltipProvider>

      {/* Discontinue Confirmation Dialog */}
      <AlertDialog
        open={showDiscontinueConfirm}
        onOpenChange={setShowDiscontinueConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Discontinue Product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discontinue{' '}
              <strong>{productName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 rounded-md bg-yellow-50 p-4 text-sm">
            <p className="font-medium text-yellow-900">
              This action is permanent:
            </p>
            <ul className="list-inside list-disc space-y-1 text-yellow-800">
              <li>Product will be hidden from storefront</li>
              <li>Cannot be reactivated</li>
              <li>Historical orders preserved</li>
              <li>Can still view in admin panel</li>
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscontinueConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Discontinue Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
