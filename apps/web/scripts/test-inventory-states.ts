import { prisma } from '~/lib/prisma'

async function testInventoryStates() {
  console.log('Setting up inventory test states...\n')

  // Get first 3 products
  const products = await prisma.product.findMany({ take: 3 })

  if (products.length < 3) {
    console.log('❌ Need at least 3 products. Run: npm run db:seed')
    return
  }

  // Test out of stock (0 inventory)
  await prisma.product.update({
    where: { id: products[0].id },
    data: { inventory: 0 },
  })
  console.log(`✅ Set ${products[0].name} to OUT OF STOCK (inventory: 0)`)
  console.log(`   Visit: /products/${products[0].slug}`)

  // Test low stock (5 inventory)
  await prisma.product.update({
    where: { id: products[1].id },
    data: { inventory: 5 },
  })
  console.log(`\n✅ Set ${products[1].name} to LOW STOCK (inventory: 5)`)
  console.log(`   Visit: /products/${products[1].slug}`)

  // Test in stock (50 inventory)
  await prisma.product.update({
    where: { id: products[2].id },
    data: { inventory: 50 },
  })
  console.log(`\n✅ Set ${products[2].name} to IN STOCK (inventory: 50)`)
  console.log(`   Visit: /products/${products[2].slug}`)

  console.log('\n📝 Test each product page and verify badge colors:')
  console.log('   - Out of Stock: Red badge')
  console.log('   - Low Stock: Yellow badge with count')
  console.log('   - In Stock: Green badge')

  await prisma.$disconnect()
}

testInventoryStates().catch(console.error)
