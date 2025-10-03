import { initTRPC, TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth/next'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { z, ZodError } from 'zod'

// Create context for tRPC requests

export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  // Get the session from NextAuth (App Router)
  const session = await getServerSession(authOptions)

  return {
    session,
    user: session?.user || null, // User is null if not authenticated
  }
}

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    }
  },
})

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router

// Public procedure (no authentication required)
export const publicProcedure = t.procedure

// Protected procedure (authentication required)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      // Type-safe context with authenticated user
      session: ctx.session,
      user: ctx.user,
    },
  })
})

// Admin procedure (admin role required)
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== Role.ADMIN) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // User is guaranteed to be admin
    },
  })
})
