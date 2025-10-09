'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setUser, clearAuth, setLoading } from '@/store/slices/authSlice'
import { useEffect } from 'react'
import { Role } from '@prisma/client'

export function useAuth() {
  const { data: session, status } = useSession()
  const dispatch = useAppDispatch()
  const authState = useAppSelector((state) => state.auth)

  // Sync NextAuth session with Redux store
  useEffect(() => {
    if (status === 'loading') {
      dispatch(setLoading(true))
      return
    }

    if (session?.user) {
      dispatch(
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name,
          role: session.user.role,
          emailVerified: session.user.emailVerified,
        })
      )
    } else {
      dispatch(clearAuth())
    }
  }, [session, status, dispatch])

  const login = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true))
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      return result
    } finally {
      dispatch(setLoading(false))
    }
  }

  const logout = async () => {
    try {
      dispatch(setLoading(true))
      await signOut({ redirect: true, callbackUrl: '/' })
      dispatch(clearAuth())
    } finally {
      dispatch(setLoading(false))
    }
  }

  return {
    // User data
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || status === 'loading',
    error: authState.error,

    // Role checks
    isAdmin: authState.user?.role === Role.ADMIN,
    isUser: authState.user?.role === Role.USER,

    // Actions
    login,
    logout,

    // Session status
    status,
    session,
  }
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!isLoading && !isAuthenticated) {
    throw new Error('Authentication required')
  }

  return useAuth()
}

export function useRequireAdmin() {
  const { isAdmin, isLoading } = useAuth()

  if (!isLoading && !isAdmin) {
    throw new Error('Admin access required')
  }

  return useAuth()
}
