import { prisma } from '~/lib/prisma'
import slugify from 'slugify'
import type { Prisma, ProductStatus } from '@prisma/client'

/**
 * ProductAdminService
 *
 * Business logic for product management.
 * Handles CRUD operations, slug generation, search/filter, and metrics.
 *
 * ENHANCED FEATURES:
 * - Optimized bulk operations (batch queries, not N+1)
 * - Slug preservation on non-name updates (SEO-friendly)
 * - Comprehensive error handling
 * - Parallel queries for performance
 */
export class ProductAdminService {
  /**
   * Generate unique slug from product name
   *
   * Creates URL-safe slug, appends counter if duplicate exists.
   * IMPORTANT: Preserves existing slug when updating product without name change.
   *
   * @param name - Product name
   * @param productId - Optional product ID (for updates, allow existing slug)
   * @returns Unique slug
   */
  async generateUniqueSlug(name: string, productId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true })
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existing = await prisma.product.findUnique({
        where: { slug },
        select: { id: true }, // ← Only fetch ID, not entire product
      })

      // ✨ ENHANCED: Slug is unique, or it's the same product being updated
      if (!existing || existing.id === productId) {
        return slug
      }

      // Duplicate found, try with counter
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  /**
   * List products with search, filters, sorting, and pagination
   *
   * @param options - Filter, search, sort, pagination options
   * @returns Paginated products with category and metrics
   */
  async listProducts(options: {
    search?: string
    categoryId?: string
    status?: ProductStatus | 'ALL'
    sortBy?: 'name' | 'price' | 'inventory' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
    lowStockOnly?: boolean
  }) {
    const {
      search,
      categoryId,
      status = 'ALL',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      lowStockOnly = false,
    } = options

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      // Search in name OR description (case-insensitive)
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      // Filter by category
      ...(categoryId && { categoryId }),
      // Filter by status (exclude 'ALL')
      ...(status !== 'ALL' && { status }),
      ...(lowStockOnly && {
        inventory: { lt: 10 }, // Low stock threshold: < 10 units
        status: 'ACTIVE', // Only shows active products
      }),
    }

    // ✨ ENHANCED: Parallel queries for performance
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              orderItems: true, // ← Count for sales metrics
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      // Total count for pagination
      prisma.product.count({ where }),
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    }
  }

  /**
   * Get single product by ID with all relations and metrics
   *
   * @param id - Product ID
   * @returns Product with category and sales stats
   */
  async getProductById(id: string) {
    // ✨ ENHANCED: Parallel queries for product and metrics
    const [product, salesMetrics] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
            },
          },
        },
      }),

      // Calculate sales metrics (only completed orders)
      prisma.orderItem.aggregate({
        where: {
          productId: id,
          order: {
            status: 'DELIVERED',
          },
        },
        _sum: {
          quantity: true,
          price: true, // ← Total revenue
        },
        _count: true,
      }),
    ])

    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    return {
      ...product,
      metrics: {
        totalSales: salesMetrics._count || 0,
        totalRevenue: salesMetrics._sum.price || 0,
        totalQuantitySold: salesMetrics._sum.quantity || 0,
      },
    }
  }

  /**
   * Create new product
   *
   * Generates slug automatically if not provided.
   * Validates inventory >= 0 and price >= 0.
   *
   * @param data - Product creation data
   * @returns Created product
   */
  async createProduct(data: {
    name: string
    description: string
    price: number // In cents
    inventory: number
    categoryId: string
    images: string[] // S3 URLs
    status?: ProductStatus
    slug?: string // Optional: admin can override
  }) {
    // Validate inventory
    if (data.inventory < 0) {
      throw new Error('Inventory cannot be negative')
    }

    // Validate price
    if (data.price < 0) {
      throw new Error('Price cannot be negative')
    }

    // Validate images array
    if (data.images.length === 0) {
      throw new Error('At least one product image is required')
    }

    if (data.images.length > 5) {
      throw new Error('Maximum 5 images allowed per product')
    }

    // Generate slug (or use provided)
    const slug = data.slug
      ? await this.generateUniqueSlug(data.slug)
      : await this.generateUniqueSlug(data.name)

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    })

    if (!category) {
      throw new Error(`Category not found: ${data.categoryId}`)
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        inventory: data.inventory,
        categoryId: data.categoryId,
        images: data.images, // ← Prisma stores as JSON array
        status: data.status || 'ACTIVE',
        slug,
      },
      include: {
        category: true,
      },
    })

    console.log(`✅ Created product: ${product.name} (${product.id})`)
    return product
  }

  /**
   * Update existing product
   *
   * ✨ ENHANCED: Only re-generates slug if name actually changes.
   * Validates inventory and price if provided.
   *
   * @param id - Product ID
   * @param data - Update data (partial)
   * @returns Updated product
   */
  async updateProduct(
    id: string,
    data: Partial<{
      name: string
      description: string
      price: number
      inventory: number
      categoryId: string
      images: string[]
      status: ProductStatus
      slug: string
    }>
  ) {
    // Validate product exists
    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    if (!existing) {
      throw new Error(`Product not found: ${id}`)
    }

    // Validate inventory if provided
    if (data.inventory !== undefined && data.inventory < 0) {
      throw new Error('Inventory cannot be negative')
    }

    // Validate price if provided
    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price cannot be negative')
    }

    // Validate images if provided
    if (data.images !== undefined) {
      if (data.images.length === 0) {
        throw new Error('At least one product image is required')
      }
      if (data.images.length > 5) {
        throw new Error('Maximum 5 images allowed per product')
      }
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      })

      if (!category) {
        throw new Error(`Category not found: ${data.categoryId}`)
      }
    }

    // ✨ ENHANCED: Only re-generate slug if name changed
    let slug = existing.slug
    if (data.name && data.name !== existing.name) {
      // Name changed - generate new slug
      slug = data.slug
        ? await this.generateUniqueSlug(data.slug, id)
        : await this.generateUniqueSlug(data.name, id)
    } else if (data.slug && data.slug !== existing.slug) {
      // Admin manually changed slug
      slug = await this.generateUniqueSlug(data.slug, id)
    }
    // Else: name unchanged, keep existing slug (SEO preservation!)

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        slug,
      },
      include: {
        category: true,
      },
    })

    console.log(`✅ Updated product: ${product.name} (${product.id})`)
    return product
  }

  /**
   * Delete product (soft delete by default)
   *
   * Soft delete: Set status to DISCONTINUED
   * Hard delete: Only if no orders exist
   *
   * @param id - Product ID
   * @param hardDelete - If true, permanently delete (only if no orders)
   * @returns Deleted/discontinued product
   */
  async deleteProduct(id: string, hardDelete = false) {
    // Check if product has orders
    const orderCount = await prisma.orderItem.count({
      where: { productId: id },
    })

    if (hardDelete) {
      // Hard delete only allowed if no orders
      if (orderCount > 0) {
        throw new Error(
          `Cannot permanently delete product with ${orderCount} order(s). ` +
            'Use soft delete (discontinue) instead to preserve order history.'
        )
      }

      // Permanently delete
      const product = await prisma.product.delete({
        where: { id },
      })

      console.log(
        `✅ Permanently deleted product: ${product.name} (${product.id})`
      )
      return product
    } else {
      // Soft delete: set status to DISCONTINUED
      const product = await prisma.product.update({
        where: { id },
        data: { status: 'DISCONTINUED' },
      })

      console.log(`✅ Discontinued product: ${product.name} (${product.id})`)
      return product
    }
  }

  /**
   * Bulk delete products (soft delete only)
   *
   * Sets status to DISCONTINUED for all provided IDs.
   * Uses transaction for atomicity.
   *
   * @param ids - Array of product IDs
   * @returns Count of updated products
   */
  async bulkDeleteProducts(ids: string[]) {
    if (ids.length === 0) {
      throw new Error('At least one product ID required for bulk delete')
    }

    // Use transaction: all-or-nothing
    const result = await prisma.$transaction(async (tx) => {
      // Set status to DISCONTINUED for all
      const updated = await tx.product.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status: 'DISCONTINUED',
        },
      })

      return updated
    })

    console.log(`✅ Bulk discontinued ${result.count} product(s)`)
    return { count: result.count }
  }

  /**
   * Bulk update product prices
   *
   * ✨ ENHANCED: Optimized to use batch queries instead of N+1 pattern.
   * Applies percentage or fixed amount increase/decrease.
   * Uses transaction for atomicity.
   *
   * @param options - IDs, update type, value, operation
   * @returns Count of updated products
   */
  async bulkUpdatePrices(options: {
    ids: string[]
    updateType: 'PERCENTAGE' | 'FIXED_AMOUNT'
    value: number
    operation: 'INCREASE' | 'DECREASE'
  }) {
    const { ids, updateType, value, operation } = options

    if (ids.length === 0) {
      throw new Error('At least one product ID required for bulk price update')
    }

    if (value < 0) {
      throw new Error('Update value cannot be negative')
    }

    // ✨ ENHANCED: Use transaction with batch query (not N+1)
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all products in ONE query
      const products = await tx.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, price: true, name: true },
      })

      // Verify all products exist
      if (products.length !== ids.length) {
        const foundIds = products.map((p) => p.id)
        const missing = ids.filter((id) => !foundIds.includes(id))
        throw new Error(`Products not found: ${missing.join(', ')}`)
      }

      // Calculate new prices in memory
      const updates = products.map((product) => {
        let newPrice = product.price

        if (updateType === 'PERCENTAGE') {
          const adjustment = (product.price * value) / 100
          newPrice =
            operation === 'INCREASE'
              ? product.price + adjustment
              : product.price - adjustment
        } else {
          // FIXED_AMOUNT
          newPrice =
            operation === 'INCREASE'
              ? product.price + value * 100
              : product.price - value * 100
        }

        // Ensure price doesn't go negative, round to integer (cents)
        return {
          id: product.id,
          price: Math.max(0, Math.round(newPrice)),
          name: product.name,
        }
      })

      // Update all products (parallel within transaction)
      await Promise.all(
        updates.map(({ id, price }) =>
          tx.product.update({
            where: { id },
            data: { price },
          })
        )
      )

      console.log(`✅ Bulk updated prices for ${products.length} product(s)`)
      updates.forEach(({ name, id }) => {
        const oldPrice = products.find((p) => p.id === id)!.price
        const newPrice = updates.find((u) => u.id === id)!.price
        console.log(`   ${name}: $${oldPrice / 100} → $${newPrice / 100}`)
      })

      return { count: products.length }
    })

    return result
  }

  /**
   * Adjust product inventory (Story 3.2 - Task 13)
   *
   * Supports two modes:
   * - SET: Replace inventory with exact value
   * - ADJUST: Add/subtract from current inventory
   *
   * @param productId - Product ID
   * @param type - SET or ADJUST
   * @param value - New inventory (SET) or adjustment amount (ADJUST)
   * @param reason - Reason for adjustment (audit trail)
   * @returns Updated product
   */
  async adjustInventory(
    productId: string,
    type: 'SET' | 'ADJUST',
    value: number,
    reason: string
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    let newInventory: number

    if (type === 'SET') {
      // Set exact value
      newInventory = value
    } else {
      // Adjust by adding value (can be negative)
      newInventory = product.inventory + value
    }

    // Ensure inventory doesn't go negative
    if (newInventory < 0) {
      throw new Error('Inventory cannot be negative')
    }

    // Log adjustment for audit trail
    console.log(
      `Inventory adjustment: Product ${productId}, ${type} ${value}, Reason: ${reason}`
    )

    // Update inventory
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { inventory: newInventory },
      include: {
        category: true,
      },
    })

    // TODO: Create proper inventory audit log table in database
    // Store: productId, oldInventory, newInventory, type, value, reason, userId, timestamp
    // This would provide complete audit trail for compliance

    return updated
  }

  /**
   * Calculate product performance metrics (Story 3.2 - Task 12)
   *
   * Aggregates order data to provide business intelligence.
   * Only includes DELIVERED orders (completed purchases).
   *
   * @param productId - Product to calculate metrics for
   * @returns Metrics object with revenue, sales, and performance indicators
   */
  async calculateProductMetrics(productId: string) {
    // Aggregate order data for completed orders only
    const orderStats = await prisma.orderItem.aggregate({
      where: {
        productId,
        order: {
          status: 'DELIVERED', // Only count completed orders
        },
      },
      _count: {
        id: true, // Total order items
      },
      _sum: {
        quantity: true, // Total units sold
        price: true, // Total revenue (sum of item totals)
      },
    })

    // Count distinct orders
    const distinctOrders = await prisma.orderItem.findMany({
      where: {
        productId,
        order: {
          status: 'DELIVERED',
        },
      },
      select: {
        orderId: true,
      },
      distinct: ['orderId'],
    })

    // Get current product inventory for turnover calculation
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { inventory: true },
    })

    const unitsSold = orderStats._sum.quantity || 0
    const totalRevenue = orderStats._sum.price || 0
    const orderCount = distinctOrders.length
    const currentInventory = product?.inventory || 0

    return {
      totalRevenue, // Total $ generated
      unitsSold, // Total quantity sold
      orderCount, // Number of orders
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      inventoryTurnover:
        currentInventory > 0 ? unitsSold / currentInventory : 0,
      // Conversion rate placeholder (requires view tracking)
      conversionRate: null,
    }
  }

  /**
   * Update product status (Story 3.2 - Task 14)
   *
   * Enforces state machine rules:
   * - ACTIVE ↔ INACTIVE (reversible)
   * - ACTIVE/INACTIVE → DISCONTINUED (one-way)
   * - DISCONTINUED → X (cannot change)
   *
   * @param productId - Product ID
   * @param status - New status
   * @returns Updated product
   */
  async updateProductStatus(productId: string, status: ProductStatus) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    // Validate state transitions
    if (product.status === 'DISCONTINUED') {
      throw new Error(
        'Cannot change status of discontinued product (one-way transition)'
      )
    }

    // Update status
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { status },
      include: {
        category: true,
      },
    })

    return updated
  }
}

// Export singleton instance
export const productAdminService = new ProductAdminService()
