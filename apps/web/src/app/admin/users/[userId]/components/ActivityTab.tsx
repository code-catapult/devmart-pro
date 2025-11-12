'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Activity, AlertCircle } from 'lucide-react'
import type { ActivityLogEntry } from '@repo/shared/types'

/**
 * ActivityTab Component
 *
 * Displays chronological activity log timeline with metadata.
 *
 * FEATURES:
 * - Reverse chronological order (newest first)
 * - Expandable metadata for each entry (click to expand/collapse)
 * - IP address and user agent display
 * - Suspicious activity highlighting (red background/border)
 * - Timeline visualization with colored dots
 * - Heuristic-based security flagging
 *
 * MOBILE OPTIMIZATIONS:
 * - Adjusted timeline positioning (left-3 mobile, left-6 desktop)
 * - Time hidden on mobile, shown on desktop
 * - Relative dates stack vertically
 * - User agent truncated more on mobile (30 vs 50 chars)
 * - Metadata toggle with 44px touch target
 * - JSON wraps properly with smaller font
 */

interface ActivityTabProps {
  userId: string
  initialActivity: ActivityLogEntry[]
}

export function ActivityTab({ initialActivity }: ActivityTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ============================================
  // TOGGLE METADATA EXPANSION
  // ============================================

  const toggleExpanded = (logId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  // ============================================
  // DETECT SUSPICIOUS ACTIVITY
  // ============================================

  /**
   * Flag potentially suspicious activities for admin review.
   * This is a simple heuristic - in production, you'd use ML models.
   */
  const isSuspicious = (log: ActivityLogEntry): boolean => {
    const suspiciousActions = [
      'FAILED_LOGIN',
      'PASSWORD_RESET_REQUESTED',
      'PAYMENT_FAILED',
      'ACCOUNT_LOCKED',
    ]
    return suspiciousActions.some((action) => log.action.includes(action))
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            Activity Timeline
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 shrink-0">
          {initialActivity.length} events
        </p>
      </div>

      {/* ============================================ */}
      {/* ACTIVITY TIMELINE */}
      {/* ============================================ */}
      {initialActivity.length === 0 ? (
        <div className="flex min-h-[150px] sm:min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-600 px-4 text-center">
            No activity logged yet
          </p>
        </div>
      ) : (
        <div className="relative space-y-3 sm:space-y-4">
          {/* Timeline line */}
          <div className="absolute left-3 sm:left-4 md:left-6 top-2 bottom-2 w-0.5 bg-gray-200"></div>

          {initialActivity.map((log, index) => {
            const isExpanded = expandedIds.has(log.id)
            const suspicious = isSuspicious(log)

            return (
              <div
                key={log.id}
                className={`
                  relative pl-8 sm:pl-10 md:pl-14
                  ${
                    suspicious
                      ? 'rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4 -ml-1 sm:-ml-2'
                      : ''
                  }
                `}
              >
                {/* Timeline dot */}
                <div
                  className={`
                    absolute left-1.5 sm:left-2.5 md:left-4.5 top-1.5 h-3 w-3 rounded-full border-2 border-white
                    ${
                      suspicious
                        ? 'bg-red-500'
                        : index === 0
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                    }
                  `}
                ></div>

                {/* Activity content */}
                <div>
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Action */}
                      <p
                        className={`font-medium text-sm sm:text-base break-words ${
                          suspicious ? 'text-red-900' : 'text-gray-900'
                        }`}
                      >
                        {log.action}
                        {suspicious && (
                          <AlertCircle className="ml-1.5 sm:ml-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                        )}
                      </p>

                      {/* Timestamp */}
                      <p className="mt-1 text-xs sm:text-sm text-gray-600">
                        <span className="block sm:inline">
                          {format(new Date(log.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="hidden sm:inline">
                          {' at '}
                          {format(new Date(log.createdAt), 'h:mm a')}
                        </span>
                        <span className="block sm:inline sm:ml-2 text-gray-500 mt-0.5 sm:mt-0">
                          (
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                          )
                        </span>
                      </p>

                      {/* IP and User Agent (collapsed) */}
                      <div className="mt-2 text-[10px] sm:text-xs text-gray-600 space-y-0.5 sm:space-y-0">
                        <div className="break-all">
                          <span className="font-medium">IP:</span>{' '}
                          {log.ipAddress}
                        </div>
                        {log.userAgent && (
                          <div className="break-all">
                            <span className="font-medium">UA:</span>{' '}
                            <span className="hidden sm:inline">
                              {log.userAgent.substring(0, 50)}
                              {log.userAgent.length > 50 && '...'}
                            </span>
                            <span className="sm:hidden">
                              {log.userAgent.substring(0, 30)}
                              {log.userAgent.length > 30 && '...'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata toggle */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          onClick={() => toggleExpanded(log.id)}
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 min-h-[44px] sm:min-h-0 py-2 sm:py-0"
                        >
                          {isExpanded ? 'Hide' : 'Show'} details
                        </button>
                      )}

                      {/* Expanded metadata */}
                      {isExpanded && log.metadata && (
                        <div className="mt-3 rounded-lg bg-gray-100 p-2 sm:p-3">
                          <pre className="text-[10px] sm:text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
