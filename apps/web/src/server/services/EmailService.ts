import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { orderRepository } from '../repositories/OrderRepository'
import { formatPrice } from '@repo/shared/utils'

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
