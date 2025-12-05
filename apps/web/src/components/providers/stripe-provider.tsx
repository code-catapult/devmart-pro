'use client'

import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface StripeProviderProps {
  children: React.ReactNode
  options?: StripeElementsOptions
}

export function StripeProvider({ children, options }: StripeProviderProps) {
  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}
