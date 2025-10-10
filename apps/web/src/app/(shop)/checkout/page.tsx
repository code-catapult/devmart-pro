'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCart } from '~/hooks/use-cart'
import { CheckoutStepper } from '~/components/checkout/checkout-stepper'
import {
  ShippingForm,
  type ShippingFormData,
} from '~/components/forms/shipping-form'
import { PaymentForm } from '~/components/forms/payment-form'
import { OrderSummary } from '~/components/cart/order-summary'
import { redirect } from 'next/navigation'

type CheckoutStep = 'shipping' | 'payment' | 'confirmation'

export default function CheckoutPage() {
  const { data: session } = useSession()
  const { items } = useCart()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [shippingAddress, setShippingAddress] =
    useState<ShippingFormData | null>(null)
  const [_paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  // Redirect if cart is empty (check this first)
  if (items.length === 0) {
    redirect('/cart')
  }

  // Redirect if not logged in
  if (!session) {
    redirect('/auth/signin?callbackUrl=/checkout')
  }

  const handleShippingSubmit = (address: ShippingFormData) => {
    setShippingAddress(address)
    setCurrentStep('payment')
  }

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId)
    // Will navigate to confirmation page
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
            <PaymentForm
              shippingAddress={shippingAddress}
              onSuccess={handlePaymentSuccess}
              onBack={() => setCurrentStep('shipping')}
            />
          )}
        </div>

        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  )
}
