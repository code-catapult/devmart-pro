import { prisma } from '~/lib/prisma'
import type { ActivityAction, Prisma } from '@prisma/client'
import { subMinutes, subDays, subHours, differenceInDays } from 'date-fns'

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
   * Detect failed login attempts (brute force attacks)
   *
   * Threshold: 5+ failed logins in 10 minutes indicates attack
   * Returns alerts for users with excessive failures
   */
  async detectFailedLoginAttempts() {
    const tenMinutesAgo = subMinutes(new Date(), 10)

    // Group by userId and count failures
    const suspiciousUsers = await prisma.activityLog.groupBy({
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
            gte: 5, // ← Threshold
          },
        },
      },
    })

    // Get user details for each suspect
    const alerts = await Promise.all(
      suspiciousUsers.map(async (suspect) => {
        const user = await prisma.user.findUnique({
          where: { id: suspect.userId },
          select: { email: true, name: true },
        })

        // Get IP addresses used in failed attempts
        const recentFailures = await prisma.activityLog.findMany({
          where: {
            userId: suspect.userId,
            action: 'LOGIN_FAILED',
            createdAt: { gte: tenMinutesAgo },
          },
          select: { ipAddress: true },
          distinct: ['ipAddress'],
        })

        return {
          type: 'FAILED_LOGIN' as const,
          severity: (suspect._count.id >= 10 ? 'HIGH' : 'MEDIUM') as
            | 'HIGH'
            | 'MEDIUM',
          userId: suspect.userId,
          userEmail: user?.email,
          userName: user?.name,
          count: suspect._count.id,
          message: `${suspect._count.id} failed login attempts in 10 minutes`,
          evidence: {
            timeWindow: '10 minutes',
            threshold: 5,
            actual: suspect._count.id,
            ipAddresses: recentFailures.map((f) => f.ipAddress),
          },
          timestamp: new Date(),
        }
      })
    )

    return alerts
  }

  /**
   * Detect unusual login locations (account takeover)
   *
   * Flags logins from:
   * 1. New countries (never seen before)
   * 2. Impossible travel (too far too fast)
   */
  async detectUnusualLoginLocations() {
    const alerts = []

    // Get recent logins (last 24 hours)
    const recentLogins = await prisma.activityLog.findMany({
      where: {
        action: 'LOGIN',
        createdAt: {
          gte: subDays(new Date(), 1),
        },
      },
      select: {
        userId: true,
        ipAddress: true,
        metadata: true, // Contains geolocation
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Group by user
    const userLogins = new Map<string, typeof recentLogins>()
    for (const login of recentLogins) {
      if (!userLogins.has(login.userId)) {
        userLogins.set(login.userId, [])
      }
      userLogins.get(login.userId)!.push(login)
    }

    // Check each user's logins
    for (const [userId, logins] of userLogins) {
      if (logins.length === 0) continue

      // Get user's historical countries (last 90 days)
      const historicalLogins = await prisma.activityLog.findMany({
        where: {
          userId,
          action: 'LOGIN',
          createdAt: {
            gte: subDays(new Date(), 90),
            lt: subDays(new Date(), 1), // Exclude recent logins
          },
        },
        select: {
          metadata: true,
        },
      })

      const historicalCountries = new Set(
        historicalLogins
          .map((log) => {
            const metadata = log.metadata as { country?: string } | null
            return metadata?.country
          })
          .filter(Boolean) as string[]
      )

      // Check latest login for new country
      const latestLogin = logins[0]
      const metadata = latestLogin.metadata as { country?: string } | null
      const currentCountry = metadata?.country

      if (
        currentCountry &&
        historicalCountries.size > 0 &&
        !historicalCountries.has(currentCountry)
      ) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        })

        alerts.push({
          type: 'UNUSUAL_LOCATION' as const,
          severity: 'HIGH' as const,
          userId,
          userEmail: user?.email,
          userName: user?.name,
          message: `Login from new country: ${currentCountry}`,
          evidence: {
            currentCountry,
            historicalCountries: Array.from(historicalCountries),
            ipAddress: latestLogin.ipAddress,
          },
          timestamp: new Date(),
        })
      }
    }

    return alerts
  }

  /**
   * Detect rapid account creation from same IP (spam/fraud)
   *
   * Threshold: 3+ accounts created from same IP in 1 hour
   */
  async detectRapidAccountCreation() {
    const oneHourAgo = subHours(new Date(), 1)

    // Get recent user creations with IP tracking
    const creationEvents = await prisma.activityLog.findMany({
      where: {
        action: 'USER_CREATED',
        createdAt: {
          gte: oneHourAgo,
        },
      },
      select: {
        ipAddress: true,
        userId: true,
      },
    })

    // Group by IP
    const ipGroups = new Map<string, string[]>()
    for (const event of creationEvents) {
      if (!ipGroups.has(event.ipAddress)) {
        ipGroups.set(event.ipAddress, [])
      }
      ipGroups.get(event.ipAddress)!.push(event.userId)
    }

    // Find IPs with 3+ creations
    const alerts = Array.from(ipGroups.entries())
      .filter(([_ip, userIds]) => userIds.length >= 3)
      .map(([ip, userIds]) => ({
        type: 'RAPID_ACCOUNT_CREATION' as const,
        severity: (userIds.length >= 5 ? 'HIGH' : 'MEDIUM') as
          | 'HIGH'
          | 'MEDIUM',
        ipAddress: ip,
        userIds,
        count: userIds.length,
        message: `${userIds.length} accounts created from IP ${ip} in 1 hour`,
        evidence: {
          timeWindow: '1 hour',
          threshold: 3,
          actual: userIds.length,
        },
        timestamp: new Date(),
      }))

    return alerts
  }

  /**
   * Detect suspicious order patterns (fraud)
   *
   * Patterns:
   * 1. High-value order from new account
   * 2. Multiple orders in short time (card testing)
   */
  async detectSuspiciousOrders() {
    const alerts = []

    // Pattern 1: High-value first order from new account
    const highValueNewOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: subDays(new Date(), 1),
        },
        total: {
          gte: 50000, // $500+
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            _count: {
              select: { orders: true },
            },
          },
        },
      },
    })

    for (const order of highValueNewOrders) {
      const accountAge = differenceInDays(new Date(), order.user.createdAt)
      const isFirstOrder = order.user._count.orders === 1

      if (accountAge <= 7 && isFirstOrder) {
        alerts.push({
          type: 'HIGH_VALUE_NEW_ACCOUNT' as const,
          severity: 'HIGH' as const,
          userId: order.userId,
          userEmail: order.user.email,
          userName: order.user.name,
          orderId: order.id,
          orderValue: order.total,
          message: `$${(order.total / 100).toFixed(
            2
          )} order from ${accountAge}-day-old account`,
          evidence: {
            orderValue: order.total,
            accountAge,
            isFirstOrder: true,
          },
          timestamp: new Date(),
        })
      }
    }

    // Pattern 2: Rapid orders (card testing)
    const fiveMinutesAgo = subMinutes(new Date(), 5)
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
      select: {
        userId: true,
        id: true,
        total: true,
      },
    })

    // Group by user
    const userOrders = new Map<string, typeof recentOrders>()
    for (const order of recentOrders) {
      if (!userOrders.has(order.userId)) {
        userOrders.set(order.userId, [])
      }
      userOrders.get(order.userId)!.push(order)
    }

    for (const [userId, orders] of userOrders) {
      if (orders.length >= 3) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        })

        alerts.push({
          type: 'RAPID_ORDERS' as const,
          severity: 'CRITICAL' as const,
          userId,
          userEmail: user?.email,
          userName: user?.name,
          count: orders.length,
          message: `${orders.length} orders in 5 minutes (card testing suspected)`,
          evidence: {
            orderCount: orders.length,
            timeWindow: '5 minutes',
            orderIds: orders.map((o) => o.id),
          },
          timestamp: new Date(),
        })
      }
    }

    return alerts
  }

  /**
   * Get all security alerts
   *
   * Runs all detection algorithms and combines results
   */
  async getAllSecurityAlerts() {
    const [failedLogins, unusualLocations, rapidCreations, suspiciousOrders] =
      await Promise.all([
        this.detectFailedLoginAttempts(),
        this.detectUnusualLoginLocations(),
        this.detectRapidAccountCreation(),
        this.detectSuspiciousOrders(),
      ])

    // Combine all alerts
    const allAlerts = [
      ...failedLogins,
      ...unusualLocations,
      ...rapidCreations,
      ...suspiciousOrders,
    ]

    // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    allAlerts.sort((a, b) => {
      const severityA = severityOrder[a.severity]
      const severityB = severityOrder[b.severity]
      return severityA - severityB
    })

    return allAlerts
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
   * Marks logs as archived instead of deleting them.
   * In production, export to S3/cloud storage before archiving.
   *
   * @param daysToKeep Number of days to keep logs active (default 90)
   * @returns Number of archived logs
   */
  async archiveOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    // Mark logs as archived
    const result = await prisma.activityLog.updateMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        archived: false, // Only archive non-archived logs
      },
      data: {
        archived: true,
      },
    })

    console.log(
      `[AuditLogService] Archived ${result.count} logs older than ${daysToKeep} days`
    )

    return result.count
  }

  /**
   * Dismiss a security alert
   *
   * Marks alert as investigated/false positive by logging the dismissal
   * This creates an audit trail for security team oversight
   *
   * @param params Alert dismissal details
   * @returns Success status and message
   */
  async dismissSecurityAlert(params: {
    alertType: string
    userId?: string
    ipAddress?: string
    reason: string
    dismissedBy: string
    dismissedByIp: string
    dismissedByUserAgent: string
  }) {
    const {
      alertType,
      userId,
      ipAddress,
      reason,
      dismissedBy,
      dismissedByIp,
      dismissedByUserAgent,
    } = params

    // Log the dismissal for audit trail
    await prisma.activityLog.create({
      data: {
        userId: userId || 'system',
        action: 'SECURITY_ALERT_DISMISSED',
        metadata: {
          alertType,
          targetIpAddress: ipAddress,
          reason,
          dismissedBy,
          dismissedAt: new Date().toISOString(),
        },
        ipAddress: dismissedByIp,
        userAgent: dismissedByUserAgent,
      },
    })

    return {
      success: true,
      message: 'Alert dismissed and logged',
    }
  }
}

export const auditLogService = new AuditLogService()
