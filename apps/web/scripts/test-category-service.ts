import { categoryService } from '../src/server/services/CategoryService'
import { prisma } from '../src/lib/prisma'

async function testCategoryService() {
  console.log('Testing CategoryService...\n')

  try {
    // Test category creation
    console.log('1. Create root category:')
    const electronics = await categoryService.createCategory({
      name: 'Electronics',
    })
    console.log('   Created:', electronics.name, '(id:', electronics.id, ')')

    // Test child category
    console.log('\n2. Create child category:')
    const computers = await categoryService.createCategory({
      name: 'Computers',
      parentId: electronics.id,
    })
    console.log('   Created:', computers.name, 'under', electronics.name)

    // Test category tree
    console.log('\n3. Get category tree:')
    const tree = await categoryService.getCategoryTree()
    console.log('   Root categories:', tree.length)
    console.log('   First root:', tree[0]?.name)
    console.log('   Children:', tree[0]?.children.length)

    // Test category path
    console.log('\n4. Get category path:')
    const path = await categoryService.getCategoryPath(computers.id)
    console.log('   Path:', path.map((c) => c.name).join(' > '))

    // Test circular reference prevention
    console.log('\n5. Test circular reference prevention:')
    try {
      await categoryService.updateCategory(electronics.id, {
        parentId: computers.id, // ← Would create cycle: electronics → computers → electronics
      })
      console.log('   ❌ Should have rejected circular reference!')
    } catch (error) {
      if (error instanceof Error) {
        console.log('   ✅ Correctly rejected:', error.message)
      } else {
        console.log('✅ Correctly rejected:', error)
      }
    }

    // Test slug generation with duplicates
    console.log('\n6. Test slug uniqueness:')
    const cat1 = await categoryService.createCategory({ name: 'Gaming' })
    console.log('   Slug 1:', cat1.slug) // "gaming"

    const cat2 = await categoryService.createCategory({ name: 'Gaming' })
    console.log('   Slug 2:', cat2.slug) // "gaming-2"

    // Find a category with products
    console.log('\n7. Test deletion protection:')

    const categoryWithProducts = await prisma.category.findFirst({
      where: {
        products: {
          some: {}, // Has at least one product
        },
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (categoryWithProducts) {
      console.log(
        `   Found category with ${categoryWithProducts._count.products} products`
      )

      try {
        await categoryService.deleteCategory(categoryWithProducts.id)
        console.log('❌ Should have blocked deletion!')
      } catch (error) {
        if (error instanceof Error) {
          console.log('✅ Correctly blocked:', error.message)
        }
      }
    } else {
      console.log(
        '⚠️  No categories with products found. Skipping deletion protection test.'
      )
      console.log(
        '   Tip: Create a product first, then assign it to a category to test this feature.'
      )
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testCategoryService().catch(console.error)
