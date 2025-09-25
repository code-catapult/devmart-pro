import { initTRPC } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { z } from 'zod'

// Create context for tRPC requests
export const createTRPCContext = (_opts: FetchCreateContextFnOptions) => {
  return {
    // Add auth, database, etc. here
  }
}

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
})

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router
// Available without auth
export const publicProcedure = t.procedure
