import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // The .clover suffix indicates this is a pre-release or beta version of the Stripe API.
  apiVersion: '2025-09-30.clover',
  typescript: true,
})
