import { createTRPCRouter, publicProcedure } from '../trpc'
import { prisma } from '~/lib/prisma'

export const categoriesRouter = createTRPCRouter({
  /**
   * Get all categories with product counts
   */
  getAll: publicProcedure.query(async () => {
    return await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
        parent: true,
      },
      orderBy: { name: 'asc' },
    })
  }),

  /**
   * Get category tree (hierarchical structure)
   */
  getTree: publicProcedure.query(async () => {
    // Get all top-level categories (no parent)
    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })

    return rootCategories
  }),
})
