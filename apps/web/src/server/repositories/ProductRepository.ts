import { prisma } from '~/lib/prisma'
import { Prisma } from '@prisma/client'

export class ProductRepository {
  /**
   * Find many products with filtering, search, sorting, and pagination
   * @returns Products with pagination metadata
   */
  async findMany(params: {
    categoryId?: string
    search?: string
    sortBy?: 'name' | 'price' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    page: number
    limit: number
  }) {
    const {
      categoryId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page,
      limit,
    } = params

    const skip = (page - 1) * limit

    // Build where clause dynamically
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE', // Only show active products
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    // Execute queries in parallel for better performance
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: { select: { reviews: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Find product by ID with full relations
   */
  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        _count: { select: { reviews: true } },
      },
    })
  }

  /**
   * Find product by slug with full relations
   */

  async findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: { include: { parent: true } }, // For breadcrumb navigation
        _count: { select: { reviews: true } },
      },
    })
  }

  /**
   * Find a product by its SKU
   */
  async findBySku(sku: string) {
    return await prisma.product.findUnique({
      where: { sku },
    })
  }

  /**
   * Find related products based on category (exclude current product)
   */

  async findRelated(productId: string, categoryId: string, limit: number = 6) {
    return prisma.product.findMany({
      where: {
        categoryId,
        status: 'ACTIVE',
        NOT: { id: productId },
      },
      include: {
        category: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}

// Export singleton instance
export const productRepository = new ProductRepository()
