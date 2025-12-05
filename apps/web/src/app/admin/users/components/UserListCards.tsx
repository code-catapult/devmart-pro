'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { formatCurrency } from '@repo/shared/utils'
import {
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'
import type { UserListItem } from '@repo/shared/types'
import { Route } from 'next'

/**
 * UserListCards Component
 *
 * Renders user list as mobile-friendly cards (< 768px).
 *
 * WHY CARDS OVER TABLES ON MOBILE:
 * - Tables require horizontal scrolling on small screens (poor UX)
 * - Columns are too narrow to read comfortably
 * - Touch targets are too small (risk of mis-taps)
 * - Cards can stack vertically with larger touch targets
 * - Each card can show avatar, badges, and metadata comfortably
 *
 * DESIGN PRINCIPLES:
 * - Each card is a tappable link to user detail page
 * - Role badge (USER/ADMIN) for quick identification
 * - Suspended badge prominently displayed
 * - Key metrics (total spent, order count) with icons
 * - Relative date ("2 days ago") instead of absolute date
 * - 16px gap between cards for easy thumb scrolling
 */

interface UserListCardsProps {
  users: UserListItem[]
}

export function UserListCards({ users }: UserListCardsProps) {
  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/admin/users/${user.id}` as Route}
          className="
            block rounded-lg border border-gray-200 bg-white p-4
            shadow-sm transition-all
            hover:border-gray-300 hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          "
        >
          {/* ============================================ */}
          {/* HEADER: Name, Email, Badges */}
          {/* ============================================ */}
          <div className="mb-3">
            {/* Name and Role Badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {user.name || 'No name'}
              </h3>
              <span
                className={`
                  shrink-0 rounded-full px-2.5 py-0.5
                  text-xs font-medium
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
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          {/* ============================================ */}
          {/* SUSPENDED BADGE (if applicable) */}
          {/* ============================================ */}
          {user.suspended && (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">Account Suspended</span>
              {user.suspendedAt && (
                <span className="text-xs text-red-600">
                  {formatDistanceToNow(new Date(user.suspendedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* METADATA GRID: Joined, Spent, Orders */}
          {/* ============================================ */}
          <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
            {/* Joined Date */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatDistanceToNow(new Date(user.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Total Spent */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Spent</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(user.totalSpent)}
              </span>
            </div>

            {/* Order Count */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Orders</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {user.orderCount}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
