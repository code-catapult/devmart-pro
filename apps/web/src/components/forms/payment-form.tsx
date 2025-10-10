'use client'

import { Button } from '~/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { ShippingFormData } from './shipping-form'

interface PaymentFormProps {
  shippingAddress: ShippingFormData
  onSuccess: (paymentIntentId: string) => void
  onBack: () => void
}

export function PaymentForm({
  shippingAddress,
  onSuccess,
  onBack,
}: PaymentFormProps) {
  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shipping
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payment Information</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>🚧 Placeholder Component</strong>
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Full Stripe payment integration will be implemented in Task 4. This
            placeholder allows you to test the checkout navigation flow.
          </p>
        </div>

        <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Shipping To:</p>
          <p className="text-sm text-muted-foreground">
            {shippingAddress?.name}
            <br />
            {shippingAddress?.address1}
            <br />
            {shippingAddress?.city}, {shippingAddress?.state}{' '}
            {shippingAddress?.postalCode}
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => onSuccess('placeholder-payment-intent-id')}
        >
          Continue to Confirmation (Placeholder)
        </Button>
      </div>
    </div>
  )
}
