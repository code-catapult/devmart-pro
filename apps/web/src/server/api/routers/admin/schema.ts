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
    .preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
        .optional()
    )
    .describe('Auto-generated if not provided'),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be 50 characters or less')
    .regex(
      /^[A-Z0-9-]+$/,
      'SKU must contain only uppercase letters, numbers, and hyphens'
    ),
})

// ✨ ENHANCED: Composition with .partial() for updates
export const productUpdateSchema = productCreateSchema
  .partial()
  .extend({
    id: z.cuid('Invalid product ID'),
  })
  .omit({ sku: true })
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

  // Price range filters (in cents)
  priceMin: z
    .number()
    .int('Price must be a whole number (in cents)')
    .min(0, 'Price cannot be negative')
    .optional(),
  priceMax: z
    .number()
    .int('Price must be a whole number (in cents)')
    .min(0, 'Price cannot be negative')
    .optional(),

  // Inventory range filters
  inventoryMin: z
    .number()
    .int('Inventory must be a whole number')
    .min(0, 'Inventory cannot be negative')
    .optional(),
  inventoryMax: z
    .number()
    .int('Inventory must be a whole number')
    .min(0, 'Inventory cannot be negative')
    .optional(),

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
  lowStockOnly: z.boolean().optional(), // Filter for low stock products (inventory < 10)
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

export const adjustInventorySchema = z.object({
  productId: z.cuid('Invalid product ID'),
  type: z.enum(['SET', 'ADJUST']),
  value: z.number().int(),
  reason: z.string().min(1, 'Reason is required').max(200),
})

export const productMetricsSchema = z.object({
  id: z.cuid('Invalid product ID'),
})

/**
 * Enhanced Category Input Schemas
 */

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less')
    .trim(),
  slug: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
      .optional()
  ),
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

/**
 * Update Product Status Schema
 */
export const updateProductStatusSchema = z.object({
  productId: z.cuid('Invalid product ID'),
  status: z.enum(ProductStatus),
})

/**
 * Order Management Schemas
 *
 * ✨ ENHANCEMENTS:
 * - Reusable order status validations
 * - Consistent date range filters
 * - Refund reason tracking
 */

// Order Status Enum (without 'ALL' option)
export const orderStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
])

// Order Status with 'ALL' option for filtering
export const orderStatusFilterSchema = z
  .enum(['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  .default('ALL')

// Refund Reason Enum
export const refundReasonSchema = z.enum([
  'CUSTOMER_REQUEST',
  'DAMAGED',
  'OUT_OF_STOCK',
  'OTHER',
])

// Analytics Period Enum
export const analyticsPeriodSchema = z
  .enum(['daily', 'weekly', 'monthly'])
  .default('daily')

// Reusable Date Range Filter
export const dateRangeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

// Order List/Query Schema
export const orderListSchema = z.object({
  search: z.string().optional(), // Search by order number or customer name/email
  status: orderStatusFilterSchema,
  startDate: z.date().optional(), // Filter by date range (inclusive)
  endDate: z.date().optional(),
  sortBy: z.enum(['orderNumber', 'createdAt', 'total']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'), // Newest first by default
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20), // Max 100 per page prevents memory issues
})

// Single Order Fetch
export const orderIdSchema = z.object({
  id: z.cuid('Invalid order ID'),
})

// Customer Orders Query
export const customerOrdersSchema = z.object({
  userId: z.cuid('Invalid user ID'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10), // Smaller limit for customer history
})

// Order Analytics Query
export const orderAnalyticsSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  period: analyticsPeriodSchema,
})

// Update Order Status
export const updateOrderStatusSchema = z.object({
  orderId: z.cuid('Invalid order ID'),
  status: orderStatusSchema,
  notes: z.string().optional(), // Admin can add notes for audit trail
})

// Add Tracking Info
export const addTrackingInfoSchema = z.object({
  orderId: z.cuid('Invalid order ID'),
  trackingNumber: z.string().min(1, 'Tracking number is required'),
  shippingCarrier: z.string().min(1, 'Carrier is required'),
  estimatedDelivery: z.date().optional(),
})

// Process Refund
export const processRefundSchema = z.object({
  orderId: z.cuid('Invalid order ID'),
  amount: z.number().min(0), // 0 = full refund
  reason: refundReasonSchema,
  notes: z.string().optional(),
})

// Bulk Update Order Status
export const bulkUpdateOrderStatusSchema = z.object({
  orderIds: z.array(z.cuid()).min(1, 'At least one order required'),
  status: z.enum(['PROCESSING', 'SHIPPED', 'CANCELLED']), // Only allow safe bulk transitions
})
