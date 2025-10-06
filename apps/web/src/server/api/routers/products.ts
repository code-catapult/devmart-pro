import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { productRepository } from '~/server/repositories/ProductRepository'

export const productsRouter = createTRPCRouter({
  /**
   * Get all products with filtering, search, sorting, and pagination
   * Public endpoint - no authentication required
   */
  getAll: publicProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(12),
      })
    )
    .query(async ({ input }) => {
      return await productRepository.findMany(input)
    }),

  /**
   * Get single product by ID
   * Public endpoint - no authentication required
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const product = await productRepository.findById(input.id)
      if (!product) {
        throw new Error('Product not found')
      }
      return product
    }),
})
