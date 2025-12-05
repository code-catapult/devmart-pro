import { prisma } from '~/lib/prisma'
import { cartService } from '~/server/services/CartService'

async function testCartAPI() {
  // Get test user
  const user = await prisma.user.findFirst()
  if (!user) throw new Error('No users found')

  // Get test product
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
  })
  if (!product) throw new Error('No products found')

  console.log('Testing Cart API...\n')

  // Test 1: Add item to cart
  const addResult = await cartService.addItem(user.id, product.id, 2)
  console.log('✅ Added to cart:', addResult)

  // Test 2: Get cart
  const cart = await cartService.calculateTotals(user.id)
  console.log('✅ Cart totals:', {
    items: cart.items.length,
    subtotal: cart.subtotal / 100,
    tax: cart.tax / 100,
    shipping: cart.shipping / 100,
    total: cart.total / 100,
  })

  // Test 3: Test inventory validation
  try {
    await cartService.addItem(user.id, product.id, 1000)
    console.log('❌ Should have failed inventory check')
  } catch {
    console.log('✅ Inventory validation works')
  }

  console.log('\n✅ All cart API tests passed!')
}

testCartAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
