import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session || !session.user) {
    throw new Error('Authentication required')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }
  return session
}

// Additional utility for session management
export async function invalidateUserSessions(userId: string) {
  // For database sessions, NextAuth.js handles cleanup automatically
  // Custom session invalidation would require direct database queries
  console.log(
    `To invalidate sessions for user ${userId}, use NextAuth's signOut() function`
  )
}
