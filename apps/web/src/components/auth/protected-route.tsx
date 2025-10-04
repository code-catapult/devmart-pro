'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Role } from '@prisma/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import Link from 'next/link'
import { Route } from 'next'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: Role
  fallbackUrl?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
  redirectOnUnauthorized?: boolean
}

export function ProtectedRoute({
  children,
  requireRole,
  fallbackUrl = '/auth/signin',
  loadingComponent,
  unauthorizedComponent,
  redirectOnUnauthorized = true,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // ✅ Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || status === 'loading') return

    if (!session) {
      if (redirectOnUnauthorized) {
        const callbackUrl = encodeURIComponent(
          window.location.pathname + window.location.search
        )
        router.push(`${fallbackUrl}?callbackUrl=${callbackUrl}` as Route)
      }
      return
    }

    if (requireRole && session.user.role !== requireRole) {
      if (redirectOnUnauthorized) {
        const callbackUrl = encodeURIComponent(
          window.location.pathname + window.location.search
        )
        router.push(`/unauthorized?callbackUrl=${callbackUrl}`)
      }
    }
  }, [
    mounted,
    session,
    status,
    router,
    requireRole,
    fallbackUrl,
    redirectOnUnauthorized,
  ])

  // ✅ Only render dynamic UI after mount
  if (!mounted || status === 'loading') {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" text="Verifying access..." />
        </div>
      )
    )
  }

  // Not authenticated
  if (!session) {
    if (!redirectOnUnauthorized) {
      return (
        unauthorizedComponent || (
          <UnauthorizedAccess
            title="Authentication Required"
            description="Please sign in to access this page."
            actionText="Sign In"
            actionHref={fallbackUrl}
          />
        )
      )
    }
    return null
  }

  // Insufficient role
  if (requireRole && session.user.role !== requireRole) {
    if (!redirectOnUnauthorized) {
      return (
        unauthorizedComponent || (
          <UnauthorizedAccess
            title="Access Denied"
            description={`This page requires ${requireRole.toLowerCase()} access.`}
            actionText="Go Back"
            actionHref="/"
          />
        )
      )
    }
    return null
  }

  return <>{children}</>
}

// Convenience components for specific roles
export function RequireAuth({
  children,
  fallbackUrl,
  redirectOnUnauthorized = true,
}: {
  children: React.ReactNode
  fallbackUrl?: string
  redirectOnUnauthorized?: boolean
}) {
  return (
    <ProtectedRoute
      fallbackUrl={fallbackUrl}
      redirectOnUnauthorized={redirectOnUnauthorized}
    >
      {children}
    </ProtectedRoute>
  )
}

export function RequireAdmin({
  children,
  redirectOnUnauthorized = true,
}: {
  children: React.ReactNode
  redirectOnUnauthorized?: boolean
}) {
  return (
    <ProtectedRoute
      requireRole={Role.ADMIN}
      redirectOnUnauthorized={redirectOnUnauthorized}
    >
      {children}
    </ProtectedRoute>
  )
}

// Unauthorized access component
interface UnauthorizedAccessProps {
  title: string
  description: string
  actionText: string
  actionHref: string
}

function UnauthorizedAccess({
  title,
  description,
  actionText,
  actionHref,
}: UnauthorizedAccessProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href={actionHref as Route}>{actionText}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
