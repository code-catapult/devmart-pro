'use client'

import { api } from '@/utils/api'
import { useAuth } from './useAuth'
import { useAppDispatch } from '@/store'
import { updateProfile } from '@/store/slices/authSlice'

export function useUserProfile() {
  const { isAuthenticated } = useAuth()
  const dispatch = useAppDispatch()

  // Get user profile with additional data
  const profileQuery = api.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update user profile mutation
  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: (updatedUser) => {
      // Update Redux store
      dispatch(updateProfile(updatedUser))

      // Invalidate and refetch profile data
      profileQuery.refetch()
    },
  })

  // Get user's order history
  const orderHistoryQuery = api.user.getOrderHistory.useQuery(
    { page: 1, limit: 10 },
    {
      enabled: isAuthenticated,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )

  return {
    // Profile data
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.error,

    // Order history
    orderHistory: orderHistoryQuery.data,
    orderHistoryLoading: orderHistoryQuery.isLoading,
    orderHistoryError: orderHistoryQuery.error,

    // Profile updates
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error,

    // Refetch functions
    refetchProfile: profileQuery.refetch,
    refetchOrderHistory: orderHistoryQuery.refetch,
  }
}
