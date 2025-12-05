'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Role } from '@repo/shared/types'
import { Route } from 'next'

interface RouteGuardOptions {
  requireAuth?: boolean
  requireRole?: Role
  redirectTo?: string
  onUnauthorized?: () => void
  onForbidden?: () => void
}

export function useRouteGuard(options: RouteGuardOptions = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAllowed, setIsAllowed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const {
    requireAuth = false,
    requireRole,
    redirectTo = '/auth/signin',
    onUnauthorized,
    onForbidden,
  } = options

  useEffect(() => {
    if (status === 'loading') return

    let allowed = true

    // Check authentication requirement
    if (requireAuth && !session) {
      allowed = false
      if (onUnauthorized) {
        onUnauthorized()
      } else {
        const callbackUrl = encodeURIComponent(window.location.pathname)
        router.push(`${redirectTo}?callbackUrl=${callbackUrl}` as Route)
      }
    }

    // Check role requirement
    if (
      allowed &&
      requireRole &&
      (!session || session.user.role !== requireRole)
    ) {
      allowed = false
      if (onForbidden) {
        onForbidden()
      } else {
        router.push('/unauthorized')
      }
    }

    setIsAllowed(allowed)
    setIsChecking(false)
  }, [
    session,
    status,
    requireAuth,
    requireRole,
    redirectTo,
    onUnauthorized,
    onForbidden,
    router,
  ])

  return {
    isAllowed,
    isChecking,
    session,
    user: session?.user,
    isAuthenticated: !!session,
    isAdmin: session?.user?.role === Role.ADMIN,
    status,
  }
}

// Specialized hooks for common use cases
export function useRequireAuth() {
  return useRouteGuard({ requireAuth: true })
}

export function useRequireAdmin() {
  return useRouteGuard({ requireAuth: true, requireRole: Role.ADMIN })
}

export function useAuthGuard() {
  const { data: session, status } = useSession()

  return {
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    user: session?.user,
    isAdmin: session?.user?.role === Role.ADMIN,
    isUser: session?.user?.role === Role.USER,
    session,
  }
}
