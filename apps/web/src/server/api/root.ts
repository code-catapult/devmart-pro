// Primary router for server
// All routes added in /api/routers should be manually added here
import { createTRPCRouter } from './trpc'
import { healthRouter } from './routers/health'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
})

// Export type definition of API
// Enables client-side type inference
export type AppRouter = typeof appRouter
