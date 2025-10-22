import { createCallerFactory } from '~/server/api/trpc'
import { appRouter } from '~/server/api/root'
import { prisma } from '~/lib/prisma'
import { Role } from '@repo/shared/types'

// Note: This requires mocking admin session context
async function testProductEndpoints() {
  // Mock admin session context
  const createCaller = createCallerFactory(appRouter)
  const caller = createCaller({
    session: {
      user: { id: 'admin-id', email: 'admin@example.com', role: Role.ADMIN },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      role: Role.ADMIN,
      name: 'Admin User',
      emailVerified: new Date(),
      image: null,
    },
    prisma,
  })

  console.log('Testing Product Endpoints...\n')

  try {
    // Test list products
    console.log('1. List products:')
    const products = await caller.admin.products.list({
      search: 'laptop',
      status: 'ACTIVE',
      page: 1,
      limit: 10,
    })
    console.log(`   Found ${products.products.length} products`)
    console.log(`   Total: ${products.pagination.totalCount}`)

    // Test create category first (needed for product creation)
    console.log('\n2. Create category:')
    const newCategory = await caller.admin.categories.create({
      name: 'Test Electronics',
    })
    console.log(`   Created: ${newCategory.name} (${newCategory.slug})`)
    console.log(`   Category ID: ${newCategory.id}`)

    // Test create product
    console.log('\n3. Create product:')
    const newProduct = await caller.admin.products.create({
      name: 'Test Laptop',
      description: 'High-performance laptop for testing',
      price: 129900, // $1,299.00 in cents
      inventory: 50,
      categoryId: newCategory.id, // Use the real category ID
      images: ['https://example.com/laptop.jpg'],
      status: 'ACTIVE',
    })
    console.log(`   Created: ${newProduct.name} (${newProduct.slug})`)

    // Test category tree
    console.log('\n4. Get category tree:')
    const tree = await caller.admin.categories.getTree()
    console.log(`   Root categories: ${tree.length}`)
    if (tree[0]) {
      console.log(`   First root: ${tree[0].name}`)
      console.log(`   Children: ${tree[0].children.length}`)
    }

    // Test non-admin rejection
    console.log('\n5. Test non-admin access:')
    const createUserCaller = createCallerFactory(appRouter)
    const userCaller = createUserCaller({
      session: {
        user: {
          id: 'user-id',
          email: 'user@example.com',
          role: Role.USER,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: Role.USER,
        name: 'Regular User',
        emailVerified: new Date(),
        image: null,
      },
      prisma,
    })

    try {
      await userCaller.admin.products.list({ page: 1, limit: 10 })
      console.log('   ❌ Should have rejected non-admin!')
    } catch (error) {
      if (error instanceof Error) {
        console.log('   ✅ Correctly rejected non-admin:', error.message)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testProductEndpoints().catch(console.error)
