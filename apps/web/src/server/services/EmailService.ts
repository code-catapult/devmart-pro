import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { orderRepository } from '../repositories/OrderRepository'

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

type OrderWithDetails = Awaited<ReturnType<typeof orderRepository.createOrder>>

export class EmailService {
  async sendOrderConfirmation(
    order: NonNullable<OrderWithDetails>,
    userEmail: string
  ) {
    console.log(
      '📧 Order confirmation email would be sent for:',
      order.orderNumber
    )

    // Basic implementation - will be enhanced in Task 7
    const emailHtml = `
      <h1>Order Confirmation</h1>
      <p>Order Number: ${order.orderNumber}</p>
      <p>Total: $${(order.total / 100).toFixed(2)}</p>
    `

    try {
      // Only send if AWS credentials are configured
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const command = new SendEmailCommand({
          Source: process.env.AWS_EMAIL_FROM || 'noreply@devmart.com',
          Destination: {
            ToAddresses: [userEmail],
          },
          Message: {
            Subject: { Data: `Order Confirmation - ${order.orderNumber}` },
            Body: { Html: { Data: emailHtml } },
          },
        })

        await sesClient.send(command)
        console.log('✅ Email sent successfully')
      } else {
        console.log('⚠️ AWS credentials not configured - email not sent')
      }
    } catch (error) {
      console.error('❌ Email sending failed:', error)
      // Don't throw - email failure shouldn't block order creation
    }
  }
}

export const emailService = new EmailService()
