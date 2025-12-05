import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM directory handling
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

async function testOrderCreation() {
  // Dynamic imports to ensure env vars are loaded
  const { prisma } = await import('../src/lib/prisma.js')
  const { orderService } = await import(
    '../src/server/services/OrderService.js'
  )

  try {
    // Get test user with cart items
    // Verify a test email identity in AWS SES and seed the database
    // with the verified email so that you can send this test email successfully
    const user = await prisma.user.findUnique({
      where: { email: 'verifiedidentity@yourmail.com' },
      include: { cartItems: true },
    })

    if (!user || user.cartItems.length === 0) {
      console.log('❌ Need user with cart items')
      console.log('   Run: Add items to cart through the app first')
      return
    }

    const shippingAddress = {
      name: 'John Doe',
      address1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
    }

    console.log('Creating order for user:', user.email)
    console.log('Cart items:', user.cartItems.length)

    const order = await orderService.createOrderFromCart(
      user.id,
      shippingAddress,
      'pi_test_123' // Test payment intent ID
    )

    console.log('\n✅ Order Created:')
    console.log('  - Order Number:', order.orderNumber)
    console.log('  - Items:', order.orderItems.length)
    console.log('  - Total:', order.total / 100, 'USD')

    // Verify cart cleared
    const cart = await prisma.cartItem.findMany({
      where: { userId: user.id },
    })
    console.log('  - Cart cleared:', cart.length === 0 ? '✅' : '❌')

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Order creation failed:', error)
    process.exit(1)
  }
}

testOrderCreation().catch(console.error)
