import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { productAdminService } from '~/server/services/ProductAdminService'
import {
  productCreateSchema,
  productUpdateSchema,
  productListSchema,
  productIdSchema,
  bulkDeleteSchema,
  bulkUpdatePricesSchema,
  adjustInventorySchema,
  productMetricsSchema,
} from './schema'

/**
 * Product Admin Router (ENHANCED)
 *
 * Protected admin endpoints for product management.
 *
 * ✨ ENHANCEMENTS:
 * - Comprehensive error handling with TRPCError
 * - Detailed logging for debugging
 * - Input validation before service layer
 * - Graceful error messages for users
 */
export const productsRouter = createTRPCRouter({
  /**
   * List products with search, filters, and pagination
   */
  list: adminProcedure
    .input(productListSchema)
    .query(async ({ input, ctx }) => {
      try {
        console.log(`📋 Listing products:`, {
          user: ctx.session.user.email,
          filters: input,
        })

        const result = await productAdminService.listProducts(input)

        console.log(
          `✅ Found ${result.products.length} products (page ${input.page})`
        )
        return result
      } catch (error) {
        console.error('❌ Failed to list products:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch products. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Get single product by ID with metrics
   */
  getById: adminProcedure.input(productIdSchema).query(async ({ input }) => {
    try {
      const product = await productAdminService.getProductById(input.id)
      return product
    } catch (error) {
      console.error(`❌ Failed to fetch product ${input.id}:`, error)

      if (error instanceof Error && error.message.includes('not found')) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Product not found: ${input.id}`,
        })
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch product details.',
        cause: error,
      })
    }
  }),

  /**
   * Create new product
   */
  create: adminProcedure
    .input(productCreateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          `➕ Creating product: ${input.name} by ${ctx.session.user.email}`
        )

        const product = await productAdminService.createProduct(input)

        console.log(`✅ Created product: ${product.name} (${product.id})`)
        return product
      } catch (error) {
        console.error('❌ Failed to create product:', error)

        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message.includes('Category not found')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Selected category does not exist. Please choose a valid category.',
            })
          }

          if (error.message.includes('Inventory cannot be negative')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            })
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create product. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Update existing product
   */
  update: adminProcedure
    .input(productUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input

      try {
        console.log(`✏️  Updating product ${id} by ${ctx.session.user.email}`)

        const product = await productAdminService.updateProduct(id, data)

        console.log(`✅ Updated product: ${product.name} (${product.id})`)
        return product
      } catch (error) {
        console.error(`❌ Failed to update product ${id}:`, error)

        if (error instanceof Error && error.message.includes('not found')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Product not found: ${id}`,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update product. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Delete product (soft delete by default)
   */
  delete: adminProcedure
    .input(
      productIdSchema.extend({
        hardDelete: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          `🗑️  ${input.hardDelete ? 'Hard' : 'Soft'} deleting product ${
            input.id
          }`
        )

        const product = await productAdminService.deleteProduct(
          input.id,
          input.hardDelete
        )

        return {
          success: true,
          product,
          message: input.hardDelete
            ? 'Product permanently deleted'
            : 'Product discontinued',
        }
      } catch (error) {
        console.error(`❌ Failed to delete product ${input.id}:`, error)

        if (
          error instanceof Error &&
          error.message.includes('with') &&
          error.message.includes('order')
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete product. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Bulk delete products (soft delete)
   */
  bulkDelete: adminProcedure
    .input(bulkDeleteSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          `🗑️  Bulk deleting ${input.ids.length} products by ${ctx.session.user.email}`
        )

        const result = await productAdminService.bulkDeleteProducts(input.ids)

        console.log(`✅ Bulk deleted ${result.count} products`)
        return {
          success: true,
          count: result.count,
          message: `Successfully discontinued ${result.count} product(s)`,
        }
      } catch (error) {
        console.error('❌ Failed to bulk delete products:', error)

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete products. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Bulk update product prices
   */
  bulkUpdatePrices: adminProcedure
    .input(bulkUpdatePricesSchema)
    .mutation(async ({ input }) => {
      try {
        console.log(`💰 Bulk updating prices for ${input.ids.length} products`)
        console.log(
          `   Type: ${input.updateType}, Operation: ${input.operation}, Value: ${input.value}`
        )

        const result = await productAdminService.bulkUpdatePrices(input)

        console.log(`✅ Updated prices for ${result.count} products`)
        return {
          success: true,
          count: result.count,
          message: `Successfully updated prices for ${result.count} product(s)`,
        }
      } catch (error) {
        console.error('❌ Failed to bulk update prices:', error)

        if (error instanceof Error && error.message.includes('not found')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update prices. Please try again.',
          cause: error,
        })
      }
    }),

  /**
   * Adjust product inventory (Story 3.2 - Task 13)
   */
  adjustInventory: adminProcedure
    .input(adjustInventorySchema)
    .mutation(async ({ input }) => {
      return await productAdminService.adjustInventory(
        input.productId,
        input.type,
        input.value,
        input.reason
      )
    }),

  /**
   * Get product performance metrics (Story 3.2 - Task 12)
   */
  getMetrics: adminProcedure
    .input(productMetricsSchema)
    .query(async ({ input }) => {
      return await productAdminService.calculateProductMetrics(input.id)
    }),
})
