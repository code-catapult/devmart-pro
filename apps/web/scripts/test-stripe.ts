import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local file BEFORE importing anything that uses env vars
config({ path: path.join(__dirname, '../.env.local') })

async function testStripe() {
  console.log('Testing Stripe connection...\n')

  // Dynamic import to ensure dotenv has loaded first
  const { stripe } = await import('../src/lib/stripe.js')

  // Test 1: Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000, // $10.00
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
  })

  console.log('✅ Payment Intent Created:')
  console.log('  - ID:', paymentIntent.id)
  console.log('  - Amount:', paymentIntent.amount / 100, 'USD')
  console.log('  - Status:', paymentIntent.status)
  console.log(
    '  - Client Secret:',
    paymentIntent.client_secret?.slice(0, 20) + '...'
  )

  // Test 2: Retrieve payment intent
  const retrieved = await stripe.paymentIntents.retrieve(paymentIntent.id)
  console.log('\n✅ Payment Intent Retrieved:', retrieved.id)

  console.log('\n✅ Stripe integration working!')
}

testStripe().catch(console.error)
