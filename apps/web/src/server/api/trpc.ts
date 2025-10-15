import { initTRPC, TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth/next'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { authOptions } from '@/lib/auth'
import { Role } from '@repo/shared/types'
import { z, ZodError } from 'zod'

/**
 * 1. CONTEXT
 * This section defines the "context" that is available in all tRPC procedures.
 * The context is data that all of your tRPC procedures will have access to.
 */
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  // Get the session from NextAuth (App Router)
  const session = await getServerSession(authOptions)

  return {
    session,
    user: session?.user || null, // User is null if not authenticated
  }
}

/**
 * 2. INITIALIZATION
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
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

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 */
export const createTRPCRouter = t.router

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 */
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
