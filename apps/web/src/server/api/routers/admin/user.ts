import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import {
  activateAccountSchema,
  getSupportNotesSchema,
  listUsersSchema,
  addSupportNotesSchema,
  suspendAccountSchema,
  getActivityLogSchema,
  userProfileSchema,
  userRoleSchema,
  exportUserListSchema,
  userIdSchema,
  getRegistrationTrendSchema,
  getTopCustomersSchema,
  getActivityPatternsDetailedSchema,
} from './schema'
import { subDays } from 'date-fns'
import { userAdminService } from '../../../services/UserAdminService'
import { auditLogService } from '../../../services/AuditLogService'
import { supportService } from '../../../services/SupportService'
import { userExportService } from '../../../services/UserExportService'
import { userAnalyticsService } from '../../../services/UserAnalyticsService'
import { revenueAnalyticsService } from '../../../services/RevenueAnalyticsService'

export const userManagementRouter = createTRPCRouter({
  /**
   * Get paginated user list with search, filters, and sorting
   * Returns users with computed stats: orderCount, totalSpent
   */
  getUsers: adminProcedure.input(listUsersSchema).query(async ({ input }) => {
    // Delegate to service layer for business logic
    return await userAdminService.listUsers({
      search: input.search,
      role: input.role,
      status: input.status,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      page: input.page,
      limit: input.limit,
    })
  }),

  /**
   * Get detailed user profile with relations
   * Includes: orders, support notes, activity logs, computed statistics
   */
  getUserById: adminProcedure
    .input(userProfileSchema)
    .query(async ({ input }) => {
      // Use enhanced service method for parallel fetching
      const profileData = await userAdminService.getUserProfile(input.id)

      if (!profileData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return profileData
    }),

  /**
   * Get support notes for a user
   * Returns chronological history with admin author details
   */
  getSupportNotes: adminProcedure
    .input(getSupportNotesSchema)
    .query(async ({ input }) => {
      return await supportService.getNotes(input.userId, input.category)
    }),

  /**
   * Get activity log for a user with filtering
   * Used for audit trail and security monitoring
   */
  getUserActivityLog: adminProcedure
    .input(getActivityLogSchema)
    .query(async ({ input }) => {
      return await auditLogService.getActivityLog({
        userId: input.userId,
        action: input.action === 'ALL' ? undefined : input.action,
        page: input.page,
        limit: input.limit,
      })
    }),

  getExportColumns: adminProcedure.query(async () => {
    /**
     * Get available columns for export selection.
     */
    return userExportService.getAvailableColumns()
  }),

  // ============================================================================
  // USER MANAGEMENT MUTATIONS
  // ============================================================================

  /**
   * Update user role (promote to admin or demote to user)
   * Validates: Cannot demote last admin (prevents system lockout)
   * Side effects: Logs role change, sends email notification
   */
  updateUserRole: adminProcedure
    .input(userRoleSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate admin count before demotion
      if (input.role === 'USER') {
        const adminCount = await userAdminService.countAdmins()

        if (adminCount === 1) {
          const user = await ctx.prisma.user.findUnique({
            where: { id: input.userId },
            select: { role: true },
          })

          if (user?.role === 'ADMIN') {
            throw new Error(
              'Cannot demote the last admin. Promote another user to admin first.'
            )
          }
        }
      }

      // Update role via service layer
      const updatedUser = await userAdminService.updateRole(
        input.userId,
        input.role
      )

      // Log the role change for audit trail
      await auditLogService.logActivity({
        userId: input.userId,
        action: 'ROLE_CHANGED',
        metadata: {
          oldRole: updatedUser.previousRole,
          newRole: input.role,
          changedBy: ctx.session.user.id, // Admin who made the change
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })

      // TODO Task 19: Send role change email notification

      return updatedUser
    }),

  /**
   * Suspend user account
   * Side effects: Invalidates sessions, logs suspension, sends email
   */
  suspendUser: adminProcedure
    .input(suspendAccountSchema)
    .mutation(async ({ input, ctx }) => {
      // Suspend via service layer (handles session invalidation)
      const suspendedUser = await userAdminService.suspendAccount(
        input.userId,
        input.reason,
        input.notes
      )

      // Log suspension for audit trail
      await auditLogService.logActivity({
        userId: input.userId,
        action: 'ACCOUNT_SUSPENDED',
        metadata: {
          reason: input.reason,
          notes: input.notes,
          suspendedBy: ctx.session.user.id,
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })

      // TODO Task 19: Send suspension email notification

      return suspendedUser
    }),

  /**
   * Activate suspended user account
   * Side effects: Logs activation, sends email
   */
  activateUser: adminProcedure
    .input(activateAccountSchema)
    .mutation(async ({ input, ctx }) => {
      // Activate via service layer
      const activatedUser = await userAdminService.activateAccount(input.userId)

      // Log activation for audit trail
      await auditLogService.logActivity({
        userId: input.userId,
        action: 'ACCOUNT_ACTIVATED',
        metadata: {
          activatedBy: ctx.session.user.id,
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })

      // TODO Task 19: Send activation email notification

      return activatedUser
    }),

  /**
   * Add support note for customer service
   * Associates note with admin author for accountability
   */
  addSupportNote: adminProcedure
    .input(addSupportNotesSchema)
    .mutation(async ({ input, ctx }) => {
      const note = await supportService.addNote({
        userId: input.userId,
        adminId: ctx.session.user.id, // Current admin is author
        category: input.category,
        content: input.content,
      })

      return note
    }),

  exportUserList: adminProcedure
    .input(exportUserListSchema)
    .mutation(async ({ input }) => {
      /**
       * Export user list in specified format.
       *
       * Returns base64-encoded data for download in browser.
       */
      const data = await userExportService.exportUserList(
        input.format,
        input.columns,
        input.filters
      )

      // Convert to base64 for transmission
      if (input.format === 'csv') {
        return {
          data: Buffer.from(data as string).toString('base64'),
          filename: `users_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv',
        }
      } else {
        return {
          data: (data as Buffer).toString('base64'),
          filename: `users_${new Date().toISOString().split('T')[0]}.xlsx`,
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      }
    }),

  exportUserDataGDPR: adminProcedure
    .input(userIdSchema)
    .mutation(async ({ input }) => {
      /**
       * Export complete user data for GDPR compliance.
       *
       * Returns JSON data for download.
       */
      const data = await userExportService.exportUserDataGDPR(input.userId)

      return {
        data: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
        filename: `user_data_${input.userId}_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
      }
    }),

  /**
   * User Analytics
   *
   */
  getUserAnalyticsSummary: adminProcedure.query(async () => {
    return await userAnalyticsService.getSummaryMetrics()
  }),

  /**
   * Get registration trend data
   * Time-series data for chart visualization
   *
   * NOTE: Uses UserAnalyticsService from Task 5
   */
  getRegistrationTrend: adminProcedure
    .input(getRegistrationTrendSchema)
    .query(async ({ input }) => {
      const endDate = input.endDate || new Date()
      const startDate = input.startDate || subDays(endDate, 30) // Default: last 30 days

      return await userAnalyticsService.getRegistrationTrend(
        startDate,
        endDate,
        input.period
      )
    }),

  /**
   * Get revenue-based user segmentation data
   * Returns distribution across VIP/Active/Casual/Inactive segments
   *
   * NOTE: Uses RevenueAnalyticsService from Task 11 (revenue-based segmentation)
   */
  getRevenueSegmentation: adminProcedure.query(async () => {
    const segments = await revenueAnalyticsService.getRevenueSegmentation()

    // Transform to Task 13's expected format
    return [
      {
        segment: 'VIP',
        users: segments.byOrderCount['11+ orders (loyal)'],
        color: '#8b5cf6',
      },
      {
        segment: 'Active',
        users: segments.byOrderCount['6-10 orders (regular)'],
        color: '#3b82f6',
      },
      {
        segment: 'Casual',
        users: segments.byOrderCount['1-5 orders (occasional)'],
        color: '#10b981',
      },
      {
        segment: 'Inactive',
        users: segments.byOrderCount['0 orders (never purchased)'],
        color: '#6b7280',
      },
    ]
  }),

  /**
   * Get top customers by lifetime value
   * Returns highest-spending users
   *
   * NOTE: Uses RevenueAnalyticsService from Task 11 (revenue data)
   */
  getTopCustomers: adminProcedure
    .input(getTopCustomersSchema)
    .query(async ({ input }) => {
      const customers = await revenueAnalyticsService.getTopCustomers(
        input.limit
      )

      // Transform to expected format
      return customers.map((customer) => ({
        id: customer.userId,
        name: customer.name || 'Unknown',
        email: customer.email,
        orderCount: customer.orderCount,
        lifetimeValue: customer.totalSpent,
      }))
    }),

  /**
   * Get user activity patterns
   * Returns login frequency distribution
   *
   * NOTE: Uses UserAnalyticsService from Task 5
   */
  getActivityPatterns: adminProcedure
    .input(getActivityPatternsDetailedSchema)
    .query(async ({ input }) => {
      return await userAnalyticsService.getActivityPatternsDetailed(
        input.daysBack
      )
    }),

  /**
   * Get churn analysis
   * Returns at-risk and churned user counts
   *
   * NOTE: Uses UserAnalyticsService from Task 5
   */
  getChurnAnalysis: adminProcedure.query(async () => {
    return await userAnalyticsService.getChurnAnalysisSimplified()
  }),

  /**
   * Get all user analytics data in a single optimized query
   * Consolidates multiple queries to reduce network overhead and improve performance
   *
   * Returns:
   * - summary: Summary metrics (total, new, active, churn rate)
   * - registrationTrend: Time-series registration data
   * - segmentation: User segmentation pie chart data
   * - topCustomers: Highest value customers
   * - activityPatterns: Login frequency distribution
   * - churnAnalysis: At-risk and churned user counts
   */
  getUserAnalyticsAll: adminProcedure
    .input(getRegistrationTrendSchema)
    .query(async ({ input }) => {
      const endDate = input.endDate || new Date()
      const startDate = input.startDate || subDays(endDate, 30)
      const daysBack = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Execute all queries in parallel for optimal performance
      const [
        summary,
        registrationTrend,
        segments,
        topCustomers,
        activityPatterns,
        churnAnalysis,
      ] = await Promise.all([
        userAnalyticsService.getSummaryMetrics(),
        userAnalyticsService.getRegistrationTrend(
          startDate,
          endDate,
          input.period
        ),
        revenueAnalyticsService.getRevenueSegmentation(),
        revenueAnalyticsService.getTopCustomers(10),
        userAnalyticsService.getActivityPatternsDetailed(daysBack),
        userAnalyticsService.getChurnAnalysisSimplified(),
      ])

      // Transform segmentation to expected format
      const segmentation = [
        {
          segment: 'VIP',
          users: segments.byOrderCount['11+ orders (loyal)'],
          color: '#8b5cf6',
        },
        {
          segment: 'Active',
          users: segments.byOrderCount['6-10 orders (regular)'],
          color: '#3b82f6',
        },
        {
          segment: 'Casual',
          users: segments.byOrderCount['1-5 orders (occasional)'],
          color: '#10b981',
        },
        {
          segment: 'Inactive',
          users: segments.byOrderCount['0 orders (never purchased)'],
          color: '#6b7280',
        },
      ]

      // Transform top customers to expected format
      const transformedTopCustomers = topCustomers.map((customer) => ({
        id: customer.userId,
        name: customer.name || 'Unknown',
        email: customer.email,
        orderCount: customer.orderCount,
        lifetimeValue: customer.totalSpent,
      }))

      return {
        summary,
        registrationTrend,
        segmentation,
        topCustomers: transformedTopCustomers,
        activityPatterns,
        churnAnalysis,
      }
    }),
})
