// Health check router
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'

export const healthRouter = createTRPCRouter({
  // Basic health check
  ping: publicProcedure.query(() => {
    return {
      message: 'This is a test of pong',
      timestamp: `Today's date is ${new Date().toLocaleDateString()}`,
    }
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
