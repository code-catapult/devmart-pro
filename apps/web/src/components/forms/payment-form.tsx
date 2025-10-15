'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@repo/ui'
import { api } from '~/utils/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Route } from 'next'

interface ShippingAddress {
  name: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface PaymentFormProps {
  shippingAddress: ShippingAddress
  onBack: () => void
}

export function PaymentForm({ shippingAddress, onBack }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  // Create order mutation
  const createOrderMutation = api.orders.create.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent: confirmedPayment } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/confirmation`,
          },
          redirect: 'if_required', // Don't redirect if payment succeeds
        })

      if (error) {
        toast.error('Payment failed', {
          description: error.message,
        })
        setIsProcessing(false)
        return
      }

      if (confirmedPayment.status === 'succeeded') {
        // Create order
        const order = await createOrderMutation.mutateAsync({
          shippingAddress,
          paymentIntentId: confirmedPayment.id,
        })

        // Navigate to confirmation
        router.push(`/checkout/confirmation?orderId=${order.id}` as Route)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process payment'
      toast.error('Error', {
        description: errorMessage,
      })
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Payment Details</h2>

        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
          disabled={isProcessing}
        >
          Back to Shipping
        </Button>

        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Order'
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Your payment information is encrypted and secure
      </p>
    </form>
  )
}
