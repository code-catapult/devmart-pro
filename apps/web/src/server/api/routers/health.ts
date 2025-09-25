// Health check router

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'

export const healthRouter = createTRPCRouter({
  // Basic health check
  ping: publicProcedure.query(() => {
    return { message: 'pong', timestamp: new Date().toISOString() }
  }),

  // Echo procedure for testing
  echo: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return { echo: input.text }
    }),
})
