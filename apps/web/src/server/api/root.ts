// Primary router for server
// All routes added in /api/routers should be manually added here

import { createTRPCRouter } from './trpc'
import { healthRouter } from './routers/health'

export const appRouter = createTRPCRouter({
  health: healthRouter,
})

// Export type definition of API
// Enables client-side type inference
export type AppRouter = typeof appRouter
