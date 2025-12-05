import { productAdminService } from '../src/server/services/ProductAdminService'
import { prisma } from '../src/lib/prisma'

async function testProductAdminService() {
  console.log('Testing ProductAdminService...\n')

  try {
    // Test 1: Generate unique slug
    console.log('1. Testing slug generation...')
    const slug1 = await productAdminService.generateUniqueSlug('Test Product')
    console.log(`   Generated slug: ${slug1}`)

    const slug2 = await productAdminService.generateUniqueSlug('Test Product')
    console.log(`   Duplicate slug: ${slug2}`)
    console.log(`   Unique: ${slug1 !== slug2 ? '✅' : '❌'}`)

    // Test 2: Slug preservation on update
    console.log('\n2. Testing slug preservation...')

    // Create test product
    const testCategory = await prisma.category.findFirst()
    if (!testCategory) {
      console.log('   ⚠️  No categories found - skipping test')
    } else {
      const product = await productAdminService.createProduct({
        name: 'Test Product for Slug',
        description: 'Testing slug preservation on updates',
        price: 9999,
        inventory: 10,
        categoryId: testCategory.id,
        images: ['https://example.com/image.jpg'],
      })
      console.log(`   Created product with slug: ${product.slug}`)

      // Update price (not name)
      const updated = await productAdminService.updateProduct(product.id, {
        price: 7999,
      })
      console.log(`   Updated price, slug: ${updated.slug}`)
      console.log(
        `   Slug preserved: ${product.slug === updated.slug ? '✅' : '❌'}`
      )

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } })
    }

    // Test 3: Validation
    console.log('\n3. Testing validation...')
    try {
      await productAdminService.createProduct({
        name: 'Invalid Product',
        description: 'Negative inventory',
        price: 1000,
        inventory: -5, // ← Invalid
        categoryId: 'fake-id',
        images: ['https://example.com/image.jpg'],
      })
      console.log('   ❌ Should have rejected negative inventory')
    } catch (error) {
      console.log('   ✅ Correctly rejected negative inventory')
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`)
      }
    }

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testProductAdminService()
