import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM directory handling
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

async function testRollback() {
  // Dynamic import to ensure env vars are loaded
  const { prisma } = await import('../src/lib/prisma.js')

  try {
    const user = await prisma.user.findFirst()

    if (!user) {
      console.log('❌ No user found in database')
      return
    }

    console.log('Testing transaction rollback...\n')

    try {
      await prisma.$transaction(async (tx) => {
        // This will create order
        const order = await tx.order.create({
          data: {
            userId: user.id,
            orderNumber: 'TEST-ROLLBACK',
            total: 1000,
            subtotal: 1000,
            tax: 0,
            shipping: 0,
            shippingAddress: {},
            stripePaymentIntentId: 'test',
          },
        })

        console.log('Order created in transaction:', order.orderNumber)

        // Force an error to trigger rollback
        throw new Error('Simulated error!')
      })
    } catch (error) {
      console.log(
        'Transaction rolled back:',
        error instanceof Error ? error.message : String(error)
      )
    }

    // Verify order NOT in database
    const order = await prisma.order.findFirst({
      where: { orderNumber: 'TEST-ROLLBACK' },
    })

    console.log(
      '\nOrder in DB:',
      order ? '❌ ERROR - should be null' : '✅ Correctly rolled back'
    )

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testRollback().catch(console.error)
