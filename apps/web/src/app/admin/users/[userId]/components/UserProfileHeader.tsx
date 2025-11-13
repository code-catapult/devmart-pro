'use client'

import { formatDistanceToNow, format } from 'date-fns'
import {
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserProfile, UserStats } from '@repo/shared/types'
import { formatCurrency } from '@repo/shared/utils'
import { RoleManager } from './RoleManager'
import { SuspensionManager } from './SuspensionManager'
import { useState } from 'react'

/**
 * UserProfileHeader Component
 *
 * Displays user overview card with key information and stats.
 *
 * SECTIONS:
 * - User avatar and basic info (name, email, role)
 * - Account status (active/suspended with banner)
 * - Key metrics (total orders, total spent, avg order value)
 * - Account age and last order date
 *
 * MOBILE OPTIMIZATIONS:
 * - Responsive avatar sizing (h-12 mobile vs h-16 desktop)
 * - Stacking layout for user details on small screens
 * - Reduced padding and text sizes
 * - Stats grid adapts (2 columns mobile, 3 desktop)
 * - Text truncation prevents overflow
 *
 * This component is "above the fold" and provides admins with
 * the most critical information at a glance.
 */

interface UserProfileHeaderProps {
  user: UserProfile
  stats: UserStats
}

export function UserProfileHeader({ user, stats }: UserProfileHeaderProps) {
  const router = useRouter()
  const [userRole, setUserRole] = useState(user.role)
  const [suspended, setSuspended] = useState(user.suspended)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* ============================================ */}
      {/* SUSPENDED BANNER (if applicable) */}
      {/* ============================================ */}
      {suspended && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Account Suspended
              </h3>
              <p className="mt-1 text-sm text-red-700 break-words">
                {user.suspensionReason || 'No reason provided'}
                {user.suspendedAt && (
                  <span className="block sm:inline sm:ml-2 text-red-600 mt-1 sm:mt-0">
                    (
                    {formatDistanceToNow(new Date(user.suspendedAt), {
                      addSuffix: true,
                    })}
                    )
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MAIN HEADER CONTENT */}
      {/* ============================================ */}
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* ============================================ */}
          {/* LEFT SIDE: User Info */}
          {/* ============================================ */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {/* Avatar */}
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl sm:text-2xl font-bold text-blue-800">
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.email.charAt(0).toUpperCase()}
            </div>

            {/* User Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {user.name || 'No name'}
                </h1>
                {/* Role Badge */}
                <span
                  className={`
                    inline-flex rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1
                    text-xs font-semibold shrink-0 w-fit
                    ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {user.role}
                </span>
              </div>
              {/* Email */}
              <div className="mt-2 flex items-start sm:items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-sm break-all">{user.email}</span>
              </div>
              <div className="mt-4">
                <RoleManager
                  userId={user.id}
                  userName={user.name || user.email}
                  currentRole={userRole}
                  onRoleChanged={(newRole) => {
                    setUserRole(newRole)
                    // Optionally refresh page data
                  }}
                />
              </div>
              {/* Join Date */}
              <div className="mt-1 flex items-start sm:items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-sm">
                  <span className="block sm:inline">
                    Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="block sm:inline sm:ml-1 text-gray-500">
                    ({stats.accountAge} days ago)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* RIGHT SIDE: Stats Grid */}
          {/* ============================================ */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-3">
            {/* Total Orders */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide">
                  Orders
                </span>
              </div>
              <p className="mt-1.5 sm:mt-2 text-xl sm:text-xl font-bold text-gray-900">
                {stats.totalOrders}
              </p>
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600">
                {stats.completedOrders} completed
              </p>
            </div>

            {/* Total Spent */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide">
                  Total Spent
                </span>
              </div>
              <p className="mt-1.5 sm:mt-2 text-xl sm:text-xl font-bold text-gray-900 truncate">
                {formatCurrency(stats.totalSpent)}
              </p>
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600">
                Lifetime value
              </p>
            </div>

            {/* Average Order Value */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 col-span-2 md:col-span-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide">
                  Avg Order
                </span>
              </div>
              <p className="mt-1.5 sm:mt-2 text-xl sm:text-xl font-bold text-gray-900 truncate">
                {formatCurrency(stats.averageOrderValue)}
              </p>
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600">
                Per order
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <SuspensionManager
            userId={user.id}
            userName={user.name || user.email}
            suspended={suspended}
            suspensionReason={user.suspensionReason}
            suspensionNotes={user.suspensionNotes}
            suspendedAt={user.suspendedAt}
            onStatusChanged={(newSuspendedStatus) => {
              // Immediate UI update for instant feedback
              setSuspended(newSuspendedStatus)

              // Sync with server to update all suspension details
              router.refresh()
            }}
          />
        </div>
      </div>
    </div>
  )
}
