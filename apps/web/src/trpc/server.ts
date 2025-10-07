import { cache } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '~/lib/auth'
import { appRouter } from '~/server/api/root'

export const api = cache(async () => {
  // Get the session from NextAuth (completed in Story 1.3)
  const session = await getServerSession(authOptions)

  // Create context with session (matches the context from Story 1.3)
  const context = {
    session,
    user: session?.user ?? null,
  }

  return appRouter.createCaller(context)
})

// API caller for static generation contexts (build time)
// Used in generateStaticParams where there's no request context
export const staticApi = cache(async () => {
  const context = {
    session: null,
    user: null,
  }

  return appRouter.createCaller(context)
})
