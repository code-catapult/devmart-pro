import { createTRPCRouter } from '~/server/api/trpc'
import { productsRouter } from './products'
import { categoriesRouter } from './categories'
import { dashboardRouter } from './dashboard'

/**
 * Admin Router
 *
 * Composes all admin-related routers into single namespace.
 * All nested routers inherit admin authentication.
 */
export const adminRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  products: productsRouter,
  categories: categoriesRouter,
})
