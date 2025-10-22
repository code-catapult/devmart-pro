import { z } from 'zod'
import { ProductStatus } from '@prisma/client'

/**
 * Enhanced Product Input Schemas
 *
 * ✨ ENHANCEMENTS:
 * - Detailed error messages for better UX
 * - Custom validation for business rules
 * - Reusable schema composition
 */

// Product CRUD Schemas
export const productCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be 200 characters or less')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters for SEO')
    .max(5000, 'Description must be 5000 characters or less'),
  price: z
    .number()
    .int('Price must be a whole number (in cents)')
    .min(0, 'Price cannot be negative'),
  inventory: z
    .number()
    .int('Inventory must be a whole number')
    .min(0, 'Inventory cannot be negative'),
  categoryId: z

    .cuid('Invalid category ID format')
    .describe('Category must exist in database'),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'At least one product image is required')
    .max(5, 'Maximum 5 images allowed per product'),
  status: z.enum(ProductStatus).optional().default('ACTIVE'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
    .optional()
    .describe('Auto-generated if not provided'),
})

// ✨ ENHANCED: Composition with .partial() for updates
export const productUpdateSchema = productCreateSchema
  .partial()
  .extend({
    id: z.cuid('Invalid product ID'),
  })
  .refine(
    (data) => Object.keys(data).length > 1, // At least one field besides ID
    { message: 'At least one field must be provided for update' }
  )

// Product List with Advanced Filters
export const productListSchema = z.object({
  search: z.string().optional(),
  categoryId: z.cuid().optional(),
  status: z
    .union([z.enum(ProductStatus), z.literal('ALL')])
    .optional()
    .default('ALL'),
  sortBy: z
    .enum(['name', 'price', 'inventory', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100 items')
    .optional()
    .default(20),
})

// Single Product Fetch
export const productIdSchema = z.object({
  id: z.cuid('Invalid product ID'),
})

// Bulk Operations
export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.cuid())
    .min(1, 'At least one product ID required')
    .max(100, 'Cannot delete more than 100 products at once'),
})

export const bulkUpdatePricesSchema = z
  .object({
    ids: z
      .array(z.cuid())
      .min(1, 'At least one product ID required')
      .max(100, 'Cannot update more than 100 products at once'),
    updateType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z
      .number()
      .min(0, 'Value must be non-negative')
      .max(10000, 'Value seems too large, please verify'),
    operation: z.enum(['INCREASE', 'DECREASE']),
  })
  .refine(
    (data) => {
      // ✨ ENHANCED: Cross-field validation
      if (data.updateType === 'PERCENTAGE' && data.value > 100) {
        return false
      }
      return true
    },
    {
      message: 'Percentage updates should typically be 100% or less',
      path: ['value'],
    }
  )

/**
 * Enhanced Category Input Schemas
 */

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less')
    .trim(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
    .optional(),
  parentId: z.cuid('Invalid parent category ID').optional(),
})

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .extend({
    id: z.cuid('Invalid category ID'),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: 'At least one field must be provided for update',
  })

export const categoryIdSchema = z.object({
  id: z.cuid('Invalid category ID'),
})

export const reassignProductsSchema = z
  .object({
    fromCategoryId: z.cuid('Invalid source category ID'),
    toCategoryId: z.cuid('Invalid target category ID'),
  })
  .refine((data) => data.fromCategoryId !== data.toCategoryId, {
    message: 'Source and target categories must be different',
    path: ['toCategoryId'],
  })

export const deleteCategorySchema = z.object({
  id: z.cuid('Invalid category ID'),
  reassignToParent: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, moves products to parent category before deletion'),
})
