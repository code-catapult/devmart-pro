'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useCart } from '~/hooks/use-cart'
import { api } from '~/utils/api'
import { CheckoutStepper } from '~/components/checkout/checkout-stepper'
import {
  ShippingForm,
  type ShippingFormData,
} from '~/components/forms/shipping-form'
import { PaymentForm } from '~/components/forms/payment-form'
import { OrderSummary } from '~/components/cart/order-summary'
import { redirect } from 'next/navigation'
import { StripeProvider } from '~/components/providers/stripe-provider'
import { Loader2 } from 'lucide-react'

type CheckoutStep = 'shipping' | 'payment' | 'confirmation'

export default function CheckoutPage() {
  const { data: session } = useSession()
  const { items } = useCart()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [shippingAddress, setShippingAddress] =
    useState<ShippingFormData | null>(null)

  // Redirect if cart is empty (check this first)
  if (items.length === 0) {
    redirect('/cart')
  }

  // Redirect if not logged in
  if (!session) {
    redirect('/auth/signin?callbackUrl=/checkout')
  }

  // Create payment intent mutation
  const createPaymentIntentMutation =
    api.orders.createPaymentIntent.useMutation()

  // Trigger payment intent creation when entering payment step
  useEffect(() => {
    if (
      currentStep === 'payment' &&
      !createPaymentIntentMutation.data &&
      !createPaymentIntentMutation.isPending
    ) {
      createPaymentIntentMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  const handleShippingSubmit = (address: ShippingFormData) => {
    setShippingAddress(address)
    setCurrentStep('payment')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 mb-24 mt-24">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <CheckoutStepper currentStep={currentStep} />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {currentStep === 'shipping' && (
            <ShippingForm
              onSubmit={handleShippingSubmit}
              initialValues={shippingAddress ?? undefined}
            />
          )}

          {currentStep === 'payment' && shippingAddress && (
            <>
              {createPaymentIntentMutation.isPending && (
                <div className="flex items-center justify-center h-64 bg-white border rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {createPaymentIntentMutation.data?.clientSecret && (
                <StripeProvider
                  options={{
                    clientSecret: createPaymentIntentMutation.data.clientSecret,
                    appearance: { theme: 'stripe' },
                  }}
                >
                  <PaymentForm
                    shippingAddress={shippingAddress}
                    onBack={() => setCurrentStep('shipping')}
                  />
                </StripeProvider>
              )}
            </>
          )}
        </div>

        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  )
}
