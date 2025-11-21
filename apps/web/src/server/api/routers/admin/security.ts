import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { auditLogService } from '../../../services/AuditLogService'
import { dismissSecurityAlertSchema } from './schema'

/**
 * Security Monitoring Router
 *
 * Handles security threat detection and monitoring endpoints.
 * Separate from user/product routers due to:
 * - Cross-domain data aggregation (logs, orders, IPs, geo)
 * - Complex analytics queries (time windows, aggregations)
 * - Different ownership (security/platform team vs domain teams)
 * - Performance isolation (expensive queries don't impact CRUD operations)
 */
export const securityRouter = createTRPCRouter({
  // ============================================================================
  // SECURITY MONITORING ENDPOINTS
  // ============================================================================

  /**
   * Get all security alerts
   *
   * Returns combined alerts from all detection algorithms
   * Sorted by severity (CRITICAL first)
   */
  getSecurityAlerts: adminProcedure.query(async () => {
    return await auditLogService.getAllSecurityAlerts()
  }),

  /**
   * Dismiss a security alert
   *
   * Marks alert as investigated/false positive
   * Creates an audit trail for security team oversight
   */
  dismissSecurityAlert: adminProcedure
    .input(dismissSecurityAlertSchema)
    .mutation(async ({ input, ctx }) => {
      return await auditLogService.dismissSecurityAlert({
        alertType: input.alertType,
        userId: input.userId,
        ipAddress: input.ipAddress,
        reason: input.reason,
        dismissedBy: ctx.user.id,
        dismissedByIp: ctx.ip,
        dismissedByUserAgent: ctx.userAgent,
      })
    }),
})
