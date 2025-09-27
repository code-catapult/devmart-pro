import { prisma } from '../prisma'
import { ProductStatus, Prisma } from '@prisma/client'

export class ProductRepository {
  // Get all active products with category information
  static async getActiveProducts(page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        include: {
          category: true,
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({
        where: { status: ProductStatus.ACTIVE },
      }),
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // Get product by slug with all related data
  static async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  // Search products with filters
  static async searchProducts(params: {
    query?: string
    categoryId?: string
    minPrice?: number
    maxPrice?: number
    status?: ProductStatus
  }) {
    const {
      query,
      categoryId,
      minPrice,
      maxPrice,
      status = ProductStatus.ACTIVE,
    } = params

    const where: Prisma.ProductWhereInput = {
      status,
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(minPrice && { price: { gte: minPrice } }),
      ...(maxPrice && { price: { lte: maxPrice } }),
    }

    return prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get products by category with subcategories
  static async getProductsByCategory(categorySlug: string) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: { children: true },
    })

    if (!category) return null

    const categoryIds = [category.id, ...category.children.map((c) => c.id)]

    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { category, products }
  }
}
