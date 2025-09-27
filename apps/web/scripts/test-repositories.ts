import { ProductRepository } from '../src/lib/repositories/product-repository'
import { UserRepository } from '../src/lib/repositories/user-repository'
import { prisma } from '../src/lib/prisma'

async function testRepositories() {
  try {
    console.log('🧪 Testing Product Repository...')

    // Test getting active products
    const productsResult = await ProductRepository.getActiveProducts(1, 5)
    console.log(`✅ Found ${productsResult.products.length} active products`)
    console.log(
      `📊 Pagination: ${productsResult.pagination.total} total products`
    )

    // Test product search
    const searchResults = await ProductRepository.searchProducts({
      query: 'iPhone',
    })
    console.log(`🔍 Search results: ${searchResults.length} products found`)

    // Test getting products by category
    const categoryProducts =
      await ProductRepository.getProductsByCategory('electronics')
    console.log(
      `📁 Electronics category: ${
        categoryProducts?.products.length || 0
      } products`
    )

    console.log('🧪 Testing User Repository...')

    // Test finding user by email
    const user = await UserRepository.findByEmail('john@example.com')
    console.log(
      `👤 Found user: ${user?.name} with ${
        user?.cartItems.length || 0
      } cart items`
    )

    // Test getting user with orders
    if (user) {
      const userWithOrders = await UserRepository.getUserWithOrders(user.id)
      console.log(`📦 User has ${userWithOrders?.orders.length || 0} orders`)
    }

    console.log('✅ All repository tests passed!')
  } catch (error) {
    console.error('❌ Repository test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRepositories()
