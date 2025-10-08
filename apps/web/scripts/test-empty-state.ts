import { prisma } from '~/lib/prisma'

async function testEmptyState() {
  // Temporarily mark all products inactive
  await prisma.product.updateMany({
    data: { status: 'INACTIVE' },
  })

  console.log('✅ All products marked inactive')
  console.log('👉 Now visit http://localhost:3000/products to see empty state')
  console.log('👉 To restore products, run: cd apps/web && npx prisma db seed')

  await prisma.$disconnect()
}

testEmptyState().catch(console.error)
