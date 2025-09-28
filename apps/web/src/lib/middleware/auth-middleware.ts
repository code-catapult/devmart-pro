import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Role } from '@prisma/client'
import { authOptions } from '@/lib/auth'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    name?: string | null
    role: Role
  }
}

// Middleware to check if user is authenticated
export async function withAuth<T = unknown>(
  handler: (req: AuthenticatedRequest, context?: T) => Promise<NextResponse>,
  options: { requireRole?: Role } = {}
) {
  return async (req: NextRequest, context?: T) => {
    try {
      // Use getServerSession for database sessions (compatible with PrismaAdapter)
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check role if required
      if (options.requireRole && session.user.role !== options.requireRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Attach user to request
      ;(req as AuthenticatedRequest).user = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name,
        role: session.user.role,
      }

      return handler(req as AuthenticatedRequest, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Convenience middleware for admin routes
export function withAdmin<T = unknown>(
  handler: (req: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withAuth(handler, { requireRole: Role.ADMIN })
}

// Rate limiting middleware
export function withRateLimit(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: { maxRequests: number; windowMs: number } = {
    maxRequests: 100,
    windowMs: 60000,
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return async (req: AuthenticatedRequest) => {
    const clientId =
      req.user?.id ||
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'anonymous'
    const now = Date.now()
    const windowStart = now - options.windowMs

    // Clean old entries
    for (const [id, data] of requests.entries()) {
      if (data.resetTime < windowStart) {
        requests.delete(id)
      }
    }

    // Check current user's requests
    const userRequests = requests.get(clientId) || {
      count: 0,
      resetTime: now + options.windowMs,
    }

    if (userRequests.count >= options.maxRequests) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
        },
        { status: 429 }
      )
    }

    // Increment request count
    userRequests.count += 1
    requests.set(clientId, userRequests)

    return handler(req)
  }
}
