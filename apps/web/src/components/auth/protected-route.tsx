'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Role } from '@prisma/client'
import path from 'path'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: Role
  fallbackUrl?: string
}

export function ProtectedRoute({
  children,
  requireRole,
  fallbackUrl = '/auth/signin',
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      // Not authenticated
      router.push(
        `${fallbackUrl}?callbackUrl=${encodeURIComponent(pathname)}` as any
      )
      return
    }

    if (requireRole && session.user.role !== requireRole) {
      // Authenticated but insufficient permissions
      router.push('/unauthorized')
      return
    }
  }, [session, status, router, requireRole, fallbackUrl, pathname])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!session || (requireRole && session.user.role !== requireRole)) {
    return null
  }

  return <>{children}</>
}

// Convenience components for specific roles
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireRole={Role.ADMIN}>{children}</ProtectedRoute>
}
