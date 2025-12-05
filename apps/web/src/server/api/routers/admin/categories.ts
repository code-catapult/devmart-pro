import { createTRPCRouter } from '~/server/api/trpc'
import { adminProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { categoryService } from '~/server/services/CategoryService'
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryIdSchema,
  reassignProductsSchema,
  deleteCategorySchema,
} from './schema'

/**
 * Category Admin Router (ENHANCED)
 *
 * ✨ ENHANCEMENTS:
 * - Detailed error messages for circular references
 * - Logging for hierarchy operations
 * - Graceful handling of product reassignment
 */
export const categoriesRouter = createTRPCRouter({
  /**
   * Get entire category tree with product counts
   */
  getTree: adminProcedure.query(async ({ ctx }) => {
    try {
      console.log(`🌲 Fetching category tree for ${ctx.session.user.email}`)
      const tree = await categoryService.getCategoryTree()
      return tree
    } catch (error) {
      console.error('❌ Failed to fetch category tree:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load categories. Please try again.',
        cause: error,
      })
    }
  }),

  /**
   * Get single category by ID
   */
  getById: adminProcedure.input(categoryIdSchema).query(async ({ input }) => {
    try {
      const category = await categoryService.getCategoryById(input.id)
      return category
    } catch (error) {
      console.error(`❌ Failed to fetch category ${input.id}:`, error)

      if (error instanceof Error && error.message.includes('not found')) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Category not found: ${input.id}`,
        })
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch category details.',
        cause: error,
      })
    }
  }),

  /**
   * Get category path (breadcrumb trail)
   */
  getPath: adminProcedure.input(categoryIdSchema).query(async ({ input }) => {
    try {
      const path = await categoryService.getCategoryPath(input.id)
      return path
    } catch (error) {
      console.error(`❌ Failed to fetch category path for ${input.id}:`, error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch category path.',
        cause: error,
      })
    }
  }),

  /**
   * Get all descendants
   */
  getDescendants: adminProcedure
    .input(categoryIdSchema)
    .query(async ({ input }) => {
      try {
        const descendants = await categoryService.getDescendants(input.id)
        return descendants
      } catch (error) {
        console.error(`❌ Failed to fetch descendants for ${input.id}:`, error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch subcategories.',
          cause: error,
        })
      }
    }),

  /**
   * Create new category
   */
  create: adminProcedure
    .input(categoryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          `➕ Creating category: ${input.name} by ${ctx.session.user.email}`
        )

        const category = await categoryService.createCategory(input)

        console.log(`✅ Created category: ${category.name} (${category.id})`)
        return category
      } catch (error) {
        console.error('❌ Failed to create category:', error)

        if (
          error instanceof Error &&
          error.message.includes('Parent category not found')
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Selected parent category does not exist. Please choose a valid parent.',
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create category. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Update existing category
   */
  update: adminProcedure
    .input(categoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input

      try {
        console.log(`✏️  Updating category ${id} by ${ctx.session.user.email}`)

        const category = await categoryService.updateCategory(id, data)

        console.log(`✅ Updated category: ${category.name} (${category.id})`)
        return category
      } catch (error) {
        console.error(`❌ Failed to update category ${id}:`, error)

        if (error instanceof Error) {
          // Handle circular reference
          if (error.message.includes('circular reference')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            })
          }

          if (error.message.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            })
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update category. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Delete category
   */
  delete: adminProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ input }) => {
      try {
        console.log(
          `🗑️  Deleting category ${input.id} (reassignToParent: ${input.reassignToParent})`
        )

        const category = await categoryService.deleteCategory(
          input.id,
          input.reassignToParent
        )

        console.log(`✅ Deleted category: ${category.name}`)
        return {
          success: true,
          category,
          message: 'Category deleted successfully',
        }
      } catch (error) {
        console.error(`❌ Failed to delete category ${input.id}:`, error)

        if (error instanceof Error) {
          // Specific error messages
          if (
            error.message.includes('with') &&
            error.message.includes('child categories')
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            })
          }

          if (
            error.message.includes('with') &&
            error.message.includes('products')
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            })
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete category. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Reassign products between categories
   */
  reassignProducts: adminProcedure
    .input(reassignProductsSchema)
    .mutation(async ({ input }) => {
      try {
        console.log(
          `📦 Reassigning products from ${input.fromCategoryId} to ${input.toCategoryId}`
        )

        const result = await categoryService.reassignProducts(
          input.fromCategoryId,
          input.toCategoryId
        )

        console.log(`✅ Reassigned ${result.count} products`)
        return {
          success: true,
          count: result.count,
          message: `Successfully reassigned ${result.count} product(s)`,
        }
      } catch (error) {
        console.error('❌ Failed to reassign products:', error)

        if (error instanceof Error && error.message.includes('not found')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reassign products. Please try again.',
          cause: error,
        })
      }
    }),
})
