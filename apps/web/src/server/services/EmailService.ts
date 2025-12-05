import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { orderRepository } from '../repositories/OrderRepository'
import { formatPrice } from '@repo/shared/utils'
import { OrderStatus } from '@repo/shared/types'

// Constants
const EMAIL_CONFIG = {
  DEFAULT_REGION: 'us-east-1',
  DEFAULT_FROM: 'noreply@devmart.com',
  SUBJECT_PREFIX: 'Order Confirmation',
} as const

const EMAIL_STYLES = `
  body { font-family: Arial, sans-serif; line-height: 1.6; }
  .container { max-width: 600px; margin: 0 auto; }
  .header { background: #0070f3; color: white; padding: 20px; text-align: center; }
  .content { padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
  .total { font-weight: bold; font-size: 1.2em; }
` as const

// Types
type OrderWithDetails = Awaited<ReturnType<typeof orderRepository.createOrder>>
type Order = NonNullable<OrderWithDetails>

interface OrderItem {
  product: { name: string }
  quantity: number
  price: number
}

interface ShippingAddress {
  name: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country?: string
}

interface EmailConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
  fromAddress: string
}

// Utility functions
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function getEmailConfig(): EmailConfig | null {
  const region = process.env.AWS_REGION || EMAIL_CONFIG.DEFAULT_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const fromAddress = process.env.AWS_EMAIL_FROM || EMAIL_CONFIG.DEFAULT_FROM

  if (!accessKeyId || !secretAccessKey) {
    return null
  }

  return { region, accessKeyId, secretAccessKey, fromAddress }
}

export class EmailService {
  private sesClient: SESClient | null

  constructor() {
    const config = getEmailConfig()

    if (config) {
      this.sesClient = new SESClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      })
    } else {
      this.sesClient = null
      console.warn(
        '⚠️ AWS SES credentials not configured - EmailService disabled'
      )
    }
  }

  async sendOrderConfirmation(
    order: Order,
    userEmail: string,
    userName?: string
  ): Promise<void> {
    // Validate email address
    if (!isValidEmail(userEmail)) {
      console.error('❌ Invalid email address:', {
        orderNumber: order.orderNumber,
        email: userEmail,
      })
      return
    }

    // Check if SES is configured
    if (!this.sesClient) {
      console.log('⚠️ AWS credentials not configured - skipping email', {
        orderNumber: order.orderNumber,
        email: userEmail,
      })
      return
    }

    const emailHtml = this.generateOrderConfirmationHTML(order, userName)

    try {
      const config = getEmailConfig()
      if (!config) return

      const command = new SendEmailCommand({
        Source: config.fromAddress,
        Destination: {
          ToAddresses: [userEmail],
        },
        Message: {
          Subject: {
            Data: `${EMAIL_CONFIG.SUBJECT_PREFIX} - ${order.orderNumber}`,
          },
          Body: {
            Html: { Data: emailHtml },
          },
        },
      })

      await this.sesClient.send(command)
      console.log('✅ Order confirmation email sent', {
        orderNumber: order.orderNumber,
        email: userEmail,
      })
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', {
        orderNumber: order.orderNumber,
        email: userEmail,
        error: error instanceof Error ? error.message : String(error),
      })
      // Don't throw - email failure shouldn't block order creation
    }
  }

  async sendEmail(params: {
    to: string
    subject: string
    html: string
  }): Promise<void> {
    const { to, subject, html } = params

    // Validate email address
    if (!isValidEmail(to)) {
      console.error('❌ Invalid email address:', { email: to })
      return
    }

    // Check if SES is configured
    if (!this.sesClient) {
      console.log('⚠️ AWS credentials not configured - skipping email', {
        to,
        subject,
      })
      return
    }

    try {
      const config = getEmailConfig()
      if (!config) return

      const command = new SendEmailCommand({
        Source: config.fromAddress,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: { Data: html },
          },
        },
      })

      await this.sesClient.send(command)
      console.log('✅ Email sent successfully', { to, subject })
    } catch (error) {
      console.error('❌ Failed to send email:', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      })
      // Don't throw - email failure shouldn't block operations
    }
  }

  /**
   * Send order status change notification
   *
   * IMPORTANT: This should NOT throw errors that block order updates.
   * Email failures are logged but don't prevent status changes.
   */
  async sendOrderStatusChangeEmail(
    order: Order & {
      user: { name: string | null; email: string }
      orderItems: Array<{
        product: { name: string }
        quantity: number
        price: number
      }>
    },
    previousStatus: OrderStatus,
    newStatus: OrderStatus
  ): Promise<void> {
    try {
      const { subject, htmlBody } = this.buildStatusChangeEmail(
        order,
        newStatus
      )

      // Use existing sendEmail method
      await this.sendEmail({
        to: order.user.email,
        subject,
        html: htmlBody,
      })

      console.log(
        `✅ Status change email sent: ${previousStatus} → ${newStatus} to ${order.user.email}`
      )
    } catch (error) {
      // Log error but DON'T throw - email failure shouldn't block order updates
      console.error('❌ Failed to send order status change email:', {
        orderId: order.id,
        previousStatus,
        newStatus,
        error: error instanceof Error ? error.message : String(error),
      })

      // Email failure is non-fatal - order status still updated
      // Could add to a dead letter queue or alert system here
    }
  }

  /**
   * Build email content based on new status
   */
  private buildStatusChangeEmail(
    order: Order & {
      user: { name: string | null }
      orderItems: Array<{
        product: { name: string }
        quantity: number
        price: number
      }>
    },
    newStatus: OrderStatus
  ): { subject: string; htmlBody: string } {
    switch (newStatus) {
      case OrderStatus.PROCESSING:
        return {
          subject: `Your order ${order.orderNumber} is being prepared`,
          htmlBody: this.renderProcessingEmail(order),
        }

      case OrderStatus.SHIPPED:
        return {
          subject: `Your order ${order.orderNumber} has been shipped 📦`,
          htmlBody: this.renderShippedEmail(order),
        }

      case OrderStatus.DELIVERED:
        return {
          subject: `Your order ${order.orderNumber} has been delivered ✅`,
          htmlBody: this.renderDeliveredEmail(order),
        }

      case OrderStatus.CANCELLED:
        return {
          subject: `Your order ${order.orderNumber} has been cancelled`,
          htmlBody: this.renderCancelledEmail(order),
        }

      default:
        // Fallback for PENDING or unknown statuses
        return {
          subject: `Order ${order.orderNumber} status update`,
          htmlBody: `<p>Your order status has been updated to ${newStatus}.</p>`,
        }
    }
  }

  /**
   * PROCESSING email template
   */
  private renderProcessingEmail(
    order: Order & {
      user: { name: string | null }
      orderItems: Array<{
        product: { name: string }
        quantity: number
        price: number
      }>
    }
  ): string {
    const orderItemsHtml = order.orderItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
          <strong style="color: #333;">${escapeHtml(item.product.name)}</strong><br>
          <span style="color: #666; font-size: 14px;">Quantity: ${item.quantity}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
          ${formatPrice(item.price * item.quantity)}
        </td>
      </tr>
    `
      )
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Processing</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #0369a1; margin: 0 0 10px 0;">We're Preparing Your Order</h1>
    <p style="color: #075985; margin: 0;">Order #${escapeHtml(order.orderNumber)}</p>
  </div>

  <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      Hi ${escapeHtml(order.user.name || 'there')},
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      Great news! Your payment has been confirmed and we're now preparing your order for shipment.
      We'll send you another email with tracking information once your package is on its way.
    </p>
  </div>

  <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">Order Summary</h2>
    <table style="width: 100%; border-collapse: collapse;">
      ${orderItemsHtml}
      <tr>
        <td style="padding: 10px 0; border-top: 2px solid #333;">
          <strong style="color: #333;">Total</strong>
        </td>
        <td style="padding: 10px 0; border-top: 2px solid #333; text-align: right;">
          <strong style="color: #333;">${formatPrice(order.total)}</strong>
        </td>
      </tr>
    </table>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Contact our support team at ${EMAIL_CONFIG.DEFAULT_FROM}
    </p>
  </div>

  <div style="text-align: center; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} DevMart. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
  }

  /**
   * SHIPPED email template
   */
  private renderShippedEmail(
    order: Order & {
      user: { name: string | null }
      shippingCarrier: string | null
      trackingNumber: string | null
    }
  ): string {
    const trackingUrl = this.getTrackingUrl(
      order.shippingCarrier,
      order.trackingNumber
    )

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Shipped</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #166534; margin: 0 0 10px 0;">📦 Your Order Has Shipped!</h1>
    <p style="color: #15803d; margin: 0;">Order #${escapeHtml(order.orderNumber)}</p>
  </div>

  <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      Hi ${escapeHtml(order.user.name || 'there')},
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      Your package is on its way! Your order has been handed off to ${escapeHtml(
        order.shippingCarrier || 'the carrier'
      )}
      and is currently in transit to you.
    </p>
  </div>

  ${
    order.trackingNumber
      ? `
  <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #075985; font-size: 18px; margin: 0 0 10px 0;">Tracking Information</h2>
    <p style="color: #0c4a6e; margin: 0 0 5px 0;">
      <strong>Carrier:</strong> ${escapeHtml(order.shippingCarrier || 'N/A')}
    </p>
    <p style="color: #0c4a6e; margin: 0 0 15px 0;">
      <strong>Tracking Number:</strong> ${escapeHtml(order.trackingNumber)}
    </p>
    ${
      trackingUrl
        ? `
    <a href="${escapeHtml(trackingUrl)}"
       style="display: inline-block; background-color: #0284c7; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 6px; font-weight: bold;">
      Track Your Package
    </a>
    `
        : ''
    }
  </div>
  `
      : ''
  }

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions about your shipment? Contact us at ${EMAIL_CONFIG.DEFAULT_FROM}
    </p>
  </div>

  <div style="text-align: center; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} DevMart. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
  }

  /**
   * DELIVERED email template
   */
  private renderDeliveredEmail(
    order: Order & { user: { name: string | null } }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #166534; margin: 0 0 10px 0;">✅ Your Order Has Been Delivered!</h1>
    <p style="color: #15803d; margin: 0;">Order #${escapeHtml(order.orderNumber)}</p>
  </div>

  <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      Hi ${escapeHtml(order.user.name || 'there')},
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      Great news! Your package has been delivered. We hope you love your order!
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      If you have any issues or questions, please don't hesitate to reach out to our support team.
    </p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Need help with your order? Contact us at ${EMAIL_CONFIG.DEFAULT_FROM}
    </p>
  </div>

  <div style="text-align: center; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} DevMart. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
  }

  /**
   * CANCELLED email template
   */
  private renderCancelledEmail(
    order: Order & {
      user: { name: string | null }
      refundAmount: number | null
    }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fee2e2; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #991b1b; margin: 0 0 10px 0;">Order Cancelled</h1>
    <p style="color: #b91c1c; margin: 0;">Order #${escapeHtml(order.orderNumber)}</p>
  </div>

  <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      Hi ${escapeHtml(order.user.name || 'there')},
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      Your order #${escapeHtml(order.orderNumber)} has been cancelled.
      ${
        order.refundAmount && order.refundAmount > 0
          ? `A refund of ${formatPrice(
              order.refundAmount
            )} has been issued and should appear in your account within 5-10 business days.`
          : ''
      }
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      If you have any questions or didn't request this cancellation, please contact our support team immediately.
    </p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Contact us at ${EMAIL_CONFIG.DEFAULT_FROM}
    </p>
  </div>

  <div style="text-align: center; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} DevMart. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
  }

  /**
   * Helper: Get tracking URL for carrier
   */
  private getTrackingUrl(
    carrier: string | null,
    trackingNumber: string | null
  ): string | null {
    if (!carrier || !trackingNumber) return null

    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      FEDEX: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    }

    return urls[carrier.toUpperCase()] || null
  }

  private generateOrderConfirmationHTML(
    order: Order,
    userName?: string
  ): string {
    const items = order.orderItems
      .map((item: OrderItem) => {
        const productName = escapeHtml(item.product.name)
        const quantity = escapeHtml(String(item.quantity))
        const price = formatPrice(item.price * item.quantity)

        return `
        <tr>
          <td>${productName}</td>
          <td>${quantity}</td>
          <td>${price}</td>
        </tr>
      `
      })
      .join('')

    // Parse shipping address from JSON
    const shippingAddress = order.shippingAddress as unknown as ShippingAddress

    const displayName = escapeHtml(userName || 'Customer')
    const orderNumber = escapeHtml(order.orderNumber)
    const total = formatPrice(order.total)
    const shippingName = escapeHtml(shippingAddress.name)
    const address1 = escapeHtml(shippingAddress.address1)
    const city = escapeHtml(shippingAddress.city)
    const state = escapeHtml(shippingAddress.state)
    const postalCode = escapeHtml(shippingAddress.postalCode)

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            ${EMAIL_STYLES}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${displayName},</p>
              <p>Thank you for your order! Your order has been confirmed.</p>

              <h2>Order #${orderNumber}</h2>

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${items}
                </tbody>
              </table>

              <p class="total">Total: ${total}</p>

              <h3>Shipping Address</h3>
              <p>
                ${shippingName}<br>
                ${address1}<br>
                ${city}, ${state} ${postalCode}
              </p>

              <p>We'll send you tracking information when your order ships.</p>

              <p>Thanks for shopping with us!</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export const emailService = new EmailService()
