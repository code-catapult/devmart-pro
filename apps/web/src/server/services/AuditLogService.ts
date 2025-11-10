import { prisma } from '~/lib/prisma'
import type { ActivityAction, Prisma } from '@prisma/client'

/**
 * AuditLogService
 *
 * Handles activity logging for security monitoring and compliance.
 * Responsibilities:
 * - Log user and admin actions
 * - Retrieve activity history with filtering
 * - Detect suspicious activity patterns
 * - Support forensic analysis
 */
export class AuditLogService {
  /**
   * Log a user or admin activity
   *
   * IMPORTANT: Call this asynchronously (don't await) to avoid blocking user actions
   *
   * @param data Activity log data
   * @returns Created activity log
   */
  async logActivity(data: {
    userId: string
    action: ActivityAction
    metadata?: Prisma.InputJsonValue // Action-specific details
    ipAddress: string
    userAgent: string
  }) {
    try {
      const log = await prisma.activityLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })

      return log
    } catch (error) {
      // Log errors but don't throw - activity logging should never break user actions
      console.error('[AuditLogService] Failed to log activity:', error)
      return null
    }
  }

  /**
   * Get activity log for a user with filtering and pagination
   *
   * @param params User ID, action filter, pagination
   * @returns Paginated activity logs
   */
  async getActivityLog(params: {
    userId: string
    action?: ActivityAction
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = params

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      userId,
      ...(action && { action }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    }

    // Execute queries in parallel
    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Newest first
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  /**
   * Detect suspicious activity patterns
   *
   * @returns Array of suspicious activity alerts
   */
  async detectSuspiciousActivity() {
    const alerts: Array<{
      type: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH'
      userId?: string
      ipAddress?: string
      details: string
      count: number
    }> = []

    // 1. Detect multiple failed login attempts (5+ in 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const failedLogins = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        action: 'LOGIN_FAILED',
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gte: 5, // 5 or more failed attempts
          },
        },
      },
    })

    for (const record of failedLogins) {
      const user = await prisma.user.findUnique({
        where: { id: record.userId },
        select: { email: true },
      })

      alerts.push({
        type: 'Multiple Failed Logins',
        severity: 'MEDIUM',
        userId: record.userId,
        details: `${record._count.id} failed login attempts in 10 minutes for ${user?.email}`,
        count: record._count.id,
      })
    }

    // 2. Detect rapid account creation from same IP (3+ in 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Note: This requires tracking IP at account creation
    // For now, we'll detect rapid logins from new users at same IP
    const suspiciousIPs = await prisma.activityLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: 'LOGIN',
        createdAt: {
          gte: oneHourAgo,
        },
      },
      _count: {
        userId: true,
      },
      having: {
        userId: {
          _count: {
            gte: 5, // 5+ different users from same IP
          },
        },
      },
    })

    for (const record of suspiciousIPs) {
      alerts.push({
        type: 'Multiple Users from Same IP',
        severity: 'HIGH',
        ipAddress: record.ipAddress,
        details: `${record._count.userId} different users logged in from ${record.ipAddress} in 1 hour`,
        count: record._count.userId,
      })
    }

    // 3. Detect unusual login locations (new IP for established user)
    // Get users with > 10 logins (established users)
    const establishedUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        action: 'LOGIN',
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gte: 10,
          },
        },
      },
    })

    // For each established user, check if they logged in from a new IP recently
    for (const userRecord of establishedUsers.slice(0, 100)) {
      // Limit to 100 users for performance
      // Get their known IPs (more than 1 day old)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const knownIPs = await prisma.activityLog.findMany({
        where: {
          userId: userRecord.userId,
          action: 'LOGIN',
          createdAt: {
            lt: oneDayAgo,
          },
        },
        select: {
          ipAddress: true,
        },
        distinct: ['ipAddress'],
      })

      const knownIPSet = new Set(knownIPs.map((log) => log.ipAddress))

      // Get recent logins (last 24 hours)
      const recentLogins = await prisma.activityLog.findMany({
        where: {
          userId: userRecord.userId,
          action: 'LOGIN',
          createdAt: {
            gte: oneDayAgo,
          },
        },
        select: {
          ipAddress: true,
        },
        distinct: ['ipAddress'],
      })

      // Check if any recent IPs are new
      const newIPs = recentLogins.filter(
        (log) => !knownIPSet.has(log.ipAddress)
      )

      if (newIPs.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: userRecord.userId },
          select: { email: true },
        })

        alerts.push({
          type: 'Unusual Login Location',
          severity: 'LOW',
          userId: userRecord.userId,
          ipAddress: newIPs[0].ipAddress,
          details: `${user?.email} logged in from new IP: ${newIPs[0].ipAddress}`,
          count: newIPs.length,
        })
      }
    }

    return alerts
  }

  /**
   * Get activity summary for a user
   * Used for user profile statistics
   *
   * @param userId User ID
   * @returns Activity summary with counts by action type
   */
  async getUserActivitySummary(userId: string) {
    const summary = await prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: {
        id: true,
      },
    })

    // Get last login
    const lastLogin = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'LOGIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        ipAddress: true,
      },
    })

    return {
      totalActions: summary.reduce((sum, item) => sum + item._count.id, 0),
      byAction: summary.reduce(
        (acc, item) => {
          acc[item.action] = item._count.id
          return acc
        },
        {} as Record<string, number>
      ),
      lastLogin: lastLogin
        ? {
            timestamp: lastLogin.createdAt,
            ipAddress: lastLogin.ipAddress,
          }
        : null,
    }
  }

  /**
   * Archive old activity logs (for data retention compliance)
   * Run this as a background job (e.g., daily cron)
   *
   * @param daysToKeep Number of days to keep logs (default 90)
   * @returns Number of archived logs
   */
  async archiveOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    // In a real system, you'd move these to an archive table or external storage
    // For now, we'll just delete them
    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(
      `[AuditLogService] Archived ${result.count} logs older than ${daysToKeep} days`
    )

    return result.count
  }
}

export const auditLogService = new AuditLogService()
