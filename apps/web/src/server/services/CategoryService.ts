import { prisma } from '~/lib/prisma'
import slugify from 'slugify'

/**
 * CategoryService
 *
 * Business logic for hierarchical category management.
 * Handles CRUD operations, tree structures, and product reassignment.
 *
 * ENHANCED FEATURES:
 * - Comprehensive circular reference detection
 * - Detailed logging for hierarchy operations
 * - Product safety checks before deletion
 * - Optimized recursive queries with Prisma
 */
export class CategoryService {
  /**
   * Generate unique slug from category name
   */
  async generateUniqueSlug(name: string, categoryId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true })
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existing = await prisma.category.findUnique({
        where: { slug },
        select: { id: true }, // ✨ Only fetch ID for performance
      })

      if (!existing || existing.id === categoryId) {
        return slug
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  /**
   * Get entire category tree with product counts
   */
  async getCategoryTree() {
    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    _count: { select: { products: true } },
                  },
                },
                _count: { select: { products: true } },
              },
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })

    console.log(
      `✅ Fetched category tree: ${rootCategories.length} root categories`
    )
    return rootCategories
  }

  /**
   * Get category by ID with all relations
   */
  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    })

    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    return category
  }

  /**
   * Get category path (breadcrumb trail)
   * Example: [Electronics, Computers, Laptops]
   */
  async getCategoryPath(
    id: string
  ): Promise<Array<{ id: string; name: string; slug: string }>> {
    const path: Array<{ id: string; name: string; slug: string }> = []
    let currentId: string | null = id

    while (currentId) {
      const category: {
        id: string
        name: string
        slug: string
        parentId: string | null
      } | null = await prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, slug: true, parentId: true },
      })

      if (!category) break
      path.unshift(category) // Add to start (reverse order)
      currentId = category.parentId
    }

    return path
  }

  /**
   * Create new category with parent validation
   */
  async createCategory(data: {
    name: string
    slug?: string
    parentId?: string
  }) {
    // Validate parent exists
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { id: true, name: true },
      })

      if (!parent) {
        throw new Error(`Parent category not found: ${data.parentId}`)
      }
    }

    // Generate unique slug
    const slug = data.slug
      ? await this.generateUniqueSlug(data.slug)
      : await this.generateUniqueSlug(data.name)

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        parentId: data.parentId,
      },
      include: {
        parent: true,
        _count: { select: { products: true } },
      },
    })

    console.log(`✅ Created category: ${category.name} (${category.id})`)
    return category
  }

  /**
   * Update existing category with circular reference prevention
   */
  async updateCategory(
    id: string,
    data: Partial<{
      name: string
      slug: string
      parentId: string | null
    }>
  ) {
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    })

    if (!existing) {
      throw new Error(`Category not found: ${id}`)
    }

    // Prevent self-parent
    if (data.parentId === id) {
      throw new Error('Category cannot be its own parent')
    }

    // ✨ ENHANCED: Circular reference prevention
    if (data.parentId) {
      const newParent = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { id: true, name: true },
      })

      if (!newParent) {
        throw new Error(`Parent category not found: ${data.parentId}`)
      }

      // Check if new parent is a descendant (would create cycle)
      const isDescendant = await this.isDescendant(id, data.parentId)
      if (isDescendant) {
        throw new Error(
          `Cannot set "${newParent.name}" as parent: it is a descendant of "${existing.name}" (would create circular reference)`
        )
      }
    }

    // Slug handling
    let slug = existing.slug
    if (data.name && data.name !== existing.name) {
      slug = data.slug
        ? await this.generateUniqueSlug(data.slug, id)
        : await this.generateUniqueSlug(data.name, id)
    } else if (data.slug && data.slug !== existing.slug) {
      slug = await this.generateUniqueSlug(data.slug, id)
    }

    const category = await prisma.category.update({
      where: { id },
      data: { ...data, slug },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    })

    console.log(`✅ Updated category: ${category.name} (${category.id})`)
    return category
  }

  /**
   * ✨ ENHANCED: Circular reference detection with detailed path logging
   *
   * Walks up parent hierarchy to detect if potentialAncestorId
   * is actually a descendant of categoryId.
   */
  private async isDescendant(
    categoryId: string,
    potentialAncestorId: string
  ): Promise<boolean> {
    let currentId: string | null = potentialAncestorId
    const visited = new Set<string>() // ✨ Track visited for infinite loop detection

    while (currentId) {
      // ✨ Detect infinite loops (shouldn't happen, but safety check)
      if (visited.has(currentId)) {
        console.error(
          `❌ Detected existing circular reference at: ${currentId}`
        )
        return true
      }
      visited.add(currentId)

      if (currentId === categoryId) {
        console.log(
          `✅ Circular reference detected: ${potentialAncestorId} is descendant of ${categoryId}`
        )
        return true
      }

      const category: { parentId: string | null } | null =
        await prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        })

      if (!category) break
      currentId = category.parentId
    }

    return false
  }

  /**
   * Delete category with product reassignment option
   */
  async deleteCategory(id: string, reassignToParent = false) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    })

    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    // Check for child categories
    if (category.children.length > 0) {
      throw new Error(
        `Cannot delete category "${category.name}" with ${category.children.length} child categories. ` +
          'Delete or reassign children first.'
      )
    }

    // Handle products
    if (category._count.products > 0) {
      if (reassignToParent && category.parentId) {
        console.log(
          `⚠️  Reassigning ${category._count.products} products to parent category`
        )
        await prisma.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: category.parentId },
        })
      } else {
        throw new Error(
          `Cannot delete category "${category.name}" with ${category._count.products} products. ` +
            'Reassign products first or use reassignToParent option.'
        )
      }
    }

    const deleted = await prisma.category.delete({ where: { id } })
    console.log(`✅ Deleted category: ${deleted.name} (${deleted.id})`)
    return deleted
  }

  /**
   * Get all descendants of a category (recursive)
   */
  async getDescendants(id: string) {
    const descendants: Array<{
      id: string
      name: string
      slug: string
      parentId: string | null
    }> = []

    const collectDescendants = async (categoryId: string) => {
      const children = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true, name: true, slug: true, parentId: true },
      })

      for (const child of children) {
        descendants.push(child)
        await collectDescendants(child.id)
      }
    }

    await collectDescendants(id)
    return descendants
  }

  /**
   * Reassign products between categories
   */
  async reassignProducts(fromCategoryId: string, toCategoryId: string) {
    const [fromCategory, toCategory] = await Promise.all([
      prisma.category.findUnique({ where: { id: fromCategoryId } }),
      prisma.category.findUnique({ where: { id: toCategoryId } }),
    ])

    if (!fromCategory) {
      throw new Error(`Source category not found: ${fromCategoryId}`)
    }

    if (!toCategory) {
      throw new Error(`Target category not found: ${toCategoryId}`)
    }

    const result = await prisma.product.updateMany({
      where: { categoryId: fromCategoryId },
      data: { categoryId: toCategoryId },
    })

    console.log(
      `✅ Reassigned ${result.count} products from "${fromCategory.name}" to "${toCategory.name}"`
    )
    return { count: result.count }
  }
}

// Export singleton instance
export const categoryService = new CategoryService()
