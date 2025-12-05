'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, TrendingDown } from 'lucide-react'
import type { ChurnRiskUser } from '../types'

/**
 * ChurnRiskList Component
 *
 * Displays users at risk of churning.
 *
 * FEATURES:
 * - Risk score color-coding (red=high, yellow=medium, green=low)
 * - Days since login indicator
 * - Total spent value
 * - Link to user profile for action
 *
 * MOBILE OPTIMIZATION:
 * - Card layout on mobile
 * - Table layout on desktop
 */

interface ChurnRiskListProps {
  users: ChurnRiskUser[]
}

export function ChurnRiskList({ users }: ChurnRiskListProps) {
  /**
   * Get risk level color based on score.
   */
  const getRiskColor = (score: number): string => {
    if (score >= 70) return 'text-red-700 bg-red-100'
    if (score >= 40) return 'text-yellow-700 bg-yellow-100'
    return 'text-green-700 bg-green-100'
  }

  /**
   * Get risk level label based on score.
   */
  const getRiskLabel = (score: number): string => {
    if (score >= 70) return 'High Risk'
    if (score >= 40) return 'Medium Risk'
    return 'Low Risk'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Churn Risk - At-Risk Users
          </h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Users who haven`&apos;`t logged in recently and may be at risk of
          churning
        </p>
      </div>

      {/* ============================================ */}
      {/* USER LIST */}
      {/* ============================================ */}
      {users.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="text-center">
            <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No users at risk of churning - great job!
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="
                block p-4 transition-colors
                hover:bg-gray-50
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              "
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* User Info */}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {user.name || 'No name'}
                  </p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>
                      Last login:{' '}
                      {formatDistanceToNow(new Date(user.lastLoginAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      Total spent: ${user.totalSpent.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Risk Score */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Risk Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {user.riskScore}
                    </p>
                  </div>
                  <span
                    className={`
                      inline-flex rounded-full px-3 py-1
                      text-xs font-semibold
                      ${getRiskColor(user.riskScore)}
                    `}
                  >
                    {getRiskLabel(user.riskScore)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      {users.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-sm text-gray-600">
            Showing top {users.length} users at risk. Click to view profile and
            take action.
          </p>
        </div>
      )}
    </div>
  )
}
