import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM directory handling
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

async function testEmail() {
  // Dynamic import to ensure env vars are loaded
  const { emailService } = await import('../src/server/services/EmailService')

  try {
    console.log('Testing email service...\n')

    // Test email address - CHANGE THIS to your actual email
    const testEmail = 'your-email@example.com'
    const testUserName = 'Test User'

    // Create a complete mock order matching the expected type
    const mockOrder = {
      id: 'test-order-id',
      orderNumber: 'ORD-TEST-123',
      userId: 'test-user-id',
      status: 'PROCESSING' as const,
      subtotal: 5998,
      tax: 480,
      shipping: 500,
      total: 6978,
      stripePaymentIntentId: 'pi_test_123456789',
      trackingNumber: 'TRACK123456',
      shippingCarrier: 'UPS',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      refundAmount: 0,
      refundReason: null,
      refundedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderItems: [
        {
          id: 'test-item-1',
          orderId: 'test-order-id',
          productId: 'test-product-1',
          quantity: 2,
          price: 2999,
          product: {
            id: 'test-product-1',
            name: 'Premium Wireless Headphones',
            slug: 'premium-wireless-headphones',
            sku: 'HEADPHONES-001',
            description: 'High-quality wireless headphones',
            price: 2999,
            comparePrice: null,
            inventory: 50,
            images: ['/products/headphones.jpg'],
            status: 'ACTIVE' as const,
            categoryId: 'test-category',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      shippingAddress: {
        name: 'John Doe',
        address1: '123 Main St',
        address2: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'United States',
      },
    }

    console.log('Sending test order confirmation email to:', testEmail)
    console.log('Order details:')
    console.log(`  Order Number: ${mockOrder.orderNumber}`)
    console.log(`  Total: $${(mockOrder.total / 100).toFixed(2)}`)
    console.log(`  Items: ${mockOrder.orderItems.length}`)
    console.log()

    await emailService.sendOrderConfirmation(mockOrder, testEmail, testUserName)

    console.log('\n✅ Email sent successfully!')
    console.log('   Check your inbox (and spam folder)')
  } catch (error: unknown) {
    console.error('❌ Email sending failed:', error)
    process.exit(1)
  }
}

testEmail().catch(console.error)
// Test Completed Here
