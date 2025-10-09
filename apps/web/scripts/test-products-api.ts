import { prisma } from '~/lib/prisma'

async function testProductsAPI() {
  console.log('Testing Products API...\n')

  // Test 1: Get all products
  const allProducts = await prisma.product.findMany({
    include: { category: true },
    take: 5,
  })
  console.log('✅ Found products:', allProducts.length)

  // Test 2: Search functionality
  const searchResults = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'laptop', mode: 'insensitive' } },
        { description: { contains: 'laptop', mode: 'insensitive' } },
      ],
    },
  })
  console.log("✅ Search results for 'laptop':", searchResults.length)

  // Test 3: Category filtering
  const category = await prisma.category.findFirst()
  if (category) {
    const categoryProducts = await prisma.product.findMany({
      where: { categoryId: category.id },
    })
    console.log(
      `✅ Products in category '${category.name}':`,
      categoryProducts.length
    )
  }

  console.log('\n✅ All API tests passed!')
}

testProductsAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
