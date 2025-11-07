'use client'

import { useState } from 'react'
import { api } from '@/utils/api'

import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'

import { Loader2, Package, CheckCircle, ExternalLink } from 'lucide-react'
import { OrderStatus } from '@prisma/client'

// Shipping carrier configurations
const CARRIERS = {
  USPS: {
    name: 'USPS',
    trackingUrlTemplate:
      'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
    // USPS tracking numbers are typically 20-22 digits
    pattern: /^(94|93|92|94|95)\d{20}$/,
    example: '9400111899562537354321',
  },
  UPS: {
    name: 'UPS',
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={trackingNumber}',
    // UPS tracking numbers are typically 18 characters starting with "1Z"
    pattern: /^1Z[A-Z0-9]{16}$/,
    example: '1Z999AA10123456784',
  },
  FEDEX: {
    name: 'FedEx',
    trackingUrlTemplate:
      'https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}',
    // FedEx tracking numbers are typically 12 or 15 digits
    pattern: /^\d{12}(\d{3})?$/,
    example: '123456789012',
  },
  DHL: {
    name: 'DHL',
    trackingUrlTemplate:
      'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
    // DHL tracking numbers are typically 10 digits
    pattern: /^\d{10}$/,
    example: '1234567890',
  },
} as const

type CarrierType = keyof typeof CARRIERS

interface ShippingTrackingFormProps {
  orderId: string
  currentStatus: OrderStatus
  existingTrackingNumber?: string | null
  existingShippingCarrier?: string | null
}

export function ShippingTrackingForm({
  orderId,
  currentStatus,
  existingTrackingNumber,
  existingShippingCarrier,
}: ShippingTrackingFormProps) {
  // Form state
  const [isEditing, setIsEditing] = useState(!existingTrackingNumber)
  const [carrier, setCarrier] = useState<CarrierType>(
    (existingShippingCarrier as CarrierType) || 'USPS'
  )
  const [trackingNumber, setTrackingNumber] = useState(
    existingTrackingNumber || ''
  )

  // Validate tracking number format
  const carrierConfig = CARRIERS[carrier]
  const isValidFormat = carrierConfig.pattern.test(trackingNumber.trim())

  // tRPC utilities
  const utils = api.useUtils()

  // Determine if this is an add or update operation
  const isUpdate = !!existingTrackingNumber

  // Mutation for adding tracking (PROCESSING only)
  const addTrackingMutation = api.admin.orders.addTrackingInfo.useMutation({
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      void utils.admin.orders.getOrderById.invalidate({ id: orderId })
      void utils.admin.orders.getOrderTimeline.invalidate({ orderId })
      void utils.admin.orders.getOrders.invalidate()

      // Exit edit mode
      setIsEditing(false)
    },
  })

  // Mutation for updating tracking (PROCESSING or SHIPPED)
  const updateTrackingMutation =
    api.admin.orders.updateShippingTracking.useMutation({
      onSuccess: () => {
        // Invalidate queries to refetch updated data
        void utils.admin.orders.getOrderById.invalidate({ id: orderId })
        void utils.admin.orders.getOrderTimeline.invalidate({ orderId })
        void utils.admin.orders.getOrders.invalidate()

        // Exit edit mode
        setIsEditing(false)
      },
    })

  // Get the active mutation based on operation type
  const activeMutation = isUpdate ? updateTrackingMutation : addTrackingMutation

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidFormat) return

    // Call appropriate mutation based on operation type
    activeMutation.mutate({
      orderId,
      trackingNumber: trackingNumber.trim(),
      shippingCarrier: carrier,
    })
  }

  // Handle cancel
  const handleCancel = () => {
    // Reset to existing values or clear
    setTrackingNumber(existingTrackingNumber || '')
    setCarrier((existingShippingCarrier as CarrierType) || 'USPS')
    setIsEditing(false)
  }

  // Generate tracking URL
  const getTrackingUrl = (number: string, carrierType: CarrierType) => {
    return CARRIERS[carrierType].trackingUrlTemplate.replace(
      '{trackingNumber}',
      number
    )
  }

  // Check if tracking can be added (order must be PROCESSING to add new tracking)
  // Allow viewing/editing if tracking exists and order is SHIPPED
  const canAddTracking =
    currentStatus === 'PROCESSING' ||
    (!!existingTrackingNumber && currentStatus === 'SHIPPED')

  // If order status doesn't allow tracking
  if (!canAddTracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipping Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Tracking information can only be added to orders in PROCESSING
              status. Current status: <strong>{currentStatus}</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Shipping Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing && existingTrackingNumber ? (
          // Display mode - show existing tracking
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium">Tracking Added</p>
                </div>
                <p className="text-sm text-gray-500">
                  Carrier:{' '}
                  <span className="font-medium">{existingShippingCarrier}</span>
                </p>
                <p className="text-sm font-mono">{existingTrackingNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getTrackingUrl(
                      existingTrackingNumber,
                      existingShippingCarrier as CarrierType
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Track Package
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Edit mode - show form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Carrier Selection */}
            <div className="grid gap-2">
              <Label htmlFor="carrier">Shipping Carrier</Label>
              <Select
                value={carrier}
                onValueChange={(value) => {
                  setCarrier(value as CarrierType)
                  // Clear tracking number when carrier changes to avoid format confusion
                  setTrackingNumber('')
                }}
                disabled={activeMutation.isPending}
              >
                <SelectTrigger id="carrier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CARRIERS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Number Input */}
            <div className="grid gap-2">
              <Label htmlFor="tracking-number">Tracking Number</Label>
              <Input
                id="tracking-number"
                type="text"
                placeholder={`e.g., ${carrierConfig.example}`}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={activeMutation.isPending}
              />
              {trackingNumber && !isValidFormat && (
                <p className="text-sm text-red-600">
                  Invalid {carrierConfig.name} tracking number format. Expected
                  format: {carrierConfig.example}
                </p>
              )}
              <p className="text-xs text-gray-500">
                The tracking number will be validated against{' '}
                {carrierConfig.name} format requirements
              </p>
            </div>

            {/* Information Alert */}
            {currentStatus === 'PROCESSING' && !isUpdate && (
              <Alert>
                <AlertDescription>
                  Adding tracking information will automatically update the
                  order status to <strong>SHIPPED</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {activeMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {activeMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  !trackingNumber || !isValidFormat || activeMutation.isPending
                }
              >
                {activeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isUpdate ? (
                  'Update Tracking'
                ) : (
                  'Add Tracking'
                )}
              </Button>
              {existingTrackingNumber && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={activeMutation.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
