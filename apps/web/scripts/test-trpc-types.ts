import type { AppRouter } from '~/server/api/root'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Infer router types
type RouterInputs = inferRouterInputs<AppRouter>
type RouterOutputs = inferRouterOutputs<AppRouter>

/**
 * Test Input Types
 * Validates that all input schemas are correctly inferred from tRPC router
 * Note: Variables prefixed with _ to indicate intentional unused (compile-time type checking only)
 */

// Test product list input (with all optional filters)
const _testProductListInput: RouterInputs['admin']['products']['list'] = {
  search: 'laptop',
  status: 'ACTIVE',
  categoryId: 'cuid123',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 20,
}

// Test product create input (all required fields)
const _testProductCreateInput: RouterInputs['admin']['products']['create'] = {
  name: 'Test Product',
  description: 'Test description with at least 10 characters',
  price: 9999, // cents
  inventory: 100,
  categoryId: 'cuid123',
  images: ['https://example.com/image.jpg'],
  status: 'ACTIVE',
}

// Test product update input (partial fields + required id)
const _testProductUpdateInput: RouterInputs['admin']['products']['update'] = {
  id: 'cuid123',
  name: 'Updated Product', // Only updating name
}

// Test category create input (with optional parentId)
const _testCategoryCreateInput: RouterInputs['admin']['categories']['create'] =
  {
    name: 'Electronics',
    parentId: 'parent-cuid',
  }

/**
 * Test Output Types
 * Validates that all output structures are correctly inferred
 * Note: Variables prefixed with _ to indicate intentional unused (compile-time type checking only)
 */

// Test product list output (with pagination)
const _testProductListOutput: RouterOutputs['admin']['products']['list'] = {
  products: [
    {
      id: 'cuid123',
      name: 'Laptop',
      slug: 'laptop',
      description: 'Gaming laptop',
      price: 129900,
      comparePrice: null,
      inventory: 50,
      categoryId: 'cat-cuid',
      images: ['https://example.com/laptop.jpg'],
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: 'cat-cuid',
        name: 'Computers',
        slug: 'computers',
      },
      _count: {
        orderItems: 5,
      },
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    totalCount: 100,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false,
  },
}

// Test category tree output (recursive structure)
const _testCategoryTreeOutput: RouterOutputs['admin']['categories']['getTree'] =
  [
    {
      id: 'root-cuid',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices',
      imageUrl: 'https://example.com/electronics.jpg',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 10 },
      children: [
        {
          id: 'child-cuid',
          name: 'Laptops',
          slug: 'laptops',
          description: 'Portable computers',
          imageUrl: null, // Optional field can be null
          parentId: 'root-cuid',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { products: 5 },
          children: [],
        },
      ],
    },
  ]

/**
 * Compile-Time Type Assertions
 * These validate type properties at compile time
 */
type AssertProductListHasSearch =
  RouterInputs['admin']['products']['list'] extends { search?: string }
    ? true
    : never
type AssertCategoryTreeIsArray =
  RouterOutputs['admin']['categories']['getTree'] extends Array<unknown>
    ? true
    : never
type AssertProductUpdateHasId =
  RouterInputs['admin']['products']['update'] extends { id: string }
    ? true
    : never

const _assertSearchExists: AssertProductListHasSearch = true
const _assertTreeIsArray: AssertCategoryTreeIsArray = true
const _assertUpdateHasId: AssertProductUpdateHasId = true

// Success output
console.log('✅ All tRPC types validated successfully')
console.log('   - ProductListInput (with filters): ✓')
console.log('   - ProductCreateInput (all fields): ✓')
console.log('   - ProductUpdateInput (partial + id): ✓')
console.log('   - CategoryCreateInput (with parent): ✓')
console.log('   - ProductListOutput (with pagination): ✓')
console.log('   - CategoryTreeOutput (recursive): ✓')
console.log('   - Type assertions: ✓')
