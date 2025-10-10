import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { prisma } from '~/lib/prisma'
import Stripe from 'stripe'
import { OrderStatus, Prisma } from '@prisma/client'

/**
 * Logger utility for structured webhook logging
 */
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    )
  },
  error: (
    message: string,
    error?: Error | unknown,
    meta?: Record<string, unknown>
  ) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        error: errorMessage,
        stack: errorStack,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    )
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    )
  },
}

/**
 * Checks if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: eventId },
  })
  return event?.processed ?? false
}

/**
 * Records webhook event for idempotency and auditing
 */
async function recordWebhookEvent(
  eventId: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
  processed: boolean = false,
  error?: string
) {
  await prisma.webhookEvent.upsert({
    where: { stripeEventId: eventId },
    create: {
      stripeEventId: eventId,
      eventType,
      payload,
      processed,
      processingError: error,
    },
    update: {
      processed,
      processingError: error,
    },
  })
}

/**
 * Handles payment_intent.succeeded event
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Processing payment success', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
  })

  // Find the order by payment intent ID
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  })

  if (!order) {
    logger.warn('No order found for payment intent', {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  // Update order status to PROCESSING
  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.PROCESSING },
  })

  logger.info('Order status updated to PROCESSING', {
    orderId: order.id,
    orderNumber: order.orderNumber,
  })
}

/**
 * Handles payment_intent.payment_failed event
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.error('Payment failed', null, {
    paymentIntentId: paymentIntent.id,
    lastPaymentError: paymentIntent.last_payment_error?.message,
  })

  // Find the order by payment intent ID
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  })

  if (order) {
    // Update order status to CANCELLED
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    })

    logger.info('Order cancelled due to payment failure', {
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  }
}

/**
 * Handles charge.refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  logger.info('Processing refund', {
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amountRefunded: charge.amount_refunded,
  })

  if (!charge.payment_intent) {
    logger.warn('No payment intent associated with refunded charge', {
      chargeId: charge.id,
    })
    return
  }

  // Find the order by payment intent ID
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: charge.payment_intent as string },
  })

  if (order) {
    // Update order status to CANCELLED (or create a new REFUNDED status if needed)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    })

    logger.info('Order cancelled due to refund', {
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  }
}

/**
 * Handles charge.dispute.created event
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  logger.warn('Dispute created', {
    disputeId: dispute.id,
    chargeId: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason,
  })

  // You may want to notify admin, update order status, etc.
  // For now, just log it
}

/**
 * Main webhook handler
 */
export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    logger.error('No signature provided in webhook request')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Check if event already processed (idempotency)
  const alreadyProcessed = await isEventProcessed(event.id)
  if (alreadyProcessed) {
    logger.info('Event already processed, skipping', {
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json({
      received: true,
      message: 'Event already processed',
    })
  }

  // Record webhook event as received but not yet processed
  await recordWebhookEvent(
    event.id,
    event.type,
    event.data.object as unknown as Prisma.InputJsonValue,
    false
  )

  try {
    // Handle the event based on type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break

      case 'payment_intent.processing':
        logger.info('Payment processing', {
          paymentIntentId: (event.data.object as Stripe.PaymentIntent).id,
        })
        break

      default:
        logger.info('Unhandled event type', { eventType: event.type })
    }

    // Mark event as successfully processed
    await recordWebhookEvent(
      event.id,
      event.type,
      event.data.object as unknown as Prisma.InputJsonValue,
      true
    )

    return NextResponse.json({ received: true })
  } catch (error) {
    // Record processing error
    const errorMessage = error instanceof Error ? error.message : String(error)
    await recordWebhookEvent(
      event.id,
      event.type,
      event.data.object as unknown as Prisma.InputJsonValue,
      false,
      errorMessage
    )

    logger.error('Error processing webhook event', error, {
      eventId: event.id,
      eventType: event.type,
    })

    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
