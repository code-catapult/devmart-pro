import { stripe } from '~/lib/stripe'
import { TRPCError } from '@trpc/server'

export class PaymentService {
  /**
   * Create Stripe Payment Intent
   */
  async createPaymentIntent(amount: number, userId: string) {
    if (amount < 50) {
      // Stripe minimum is $0.50
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Amount must be at least $0.50',
      })
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount, // Amount in cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
        },
      })

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to initialize payment',
      })
    }
  }

  /**
   * Confirm payment intent (server-side)
   */
  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent,
        }
      }

      return {
        success: false,
        error: 'Payment not completed',
      }
    } catch (error) {
      console.error('Payment confirmation failed:', error)
      return {
        success: false,
        error: 'Payment verification failed',
      }
    }
  }
}

export const paymentService = new PaymentService()
