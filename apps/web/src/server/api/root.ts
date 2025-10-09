// Primary router for server
// All routes added in /api/routers should be manually added here
import { createTRPCRouter } from './trpc'
import { healthRouter } from './routers/health'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'
import { productsRouter } from './routers/products'
import { categoriesRouter } from './routers/categories'
import { cartRouter } from './routers/cart'
import { ordersRouter } from './routers/orders'

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  products: productsRouter,
  categories: categoriesRouter,
  cart: cartRouter,
  orders: ordersRouter,
})

// Export type definition of API
// Enables client-side type inference
export type AppRouter = typeof appRouter
