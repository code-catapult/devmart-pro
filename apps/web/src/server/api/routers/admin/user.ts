import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import {
  activateAccountSchema,
  getSupportNotesSchema,
  listUsersSchema,
  addSupportNotesSchema,
  suspendAccountSchema,
  getActivityLogSchema,
  userProfileSchema,
  userRoleSchema,
} from './schema'
import { userAdminService } from '../../../services/UserAdminService'
import { auditLogService } from '../../../services/AuditLogService'
import { supportService } from '../../../services/SupportService'

export const userRouter = createTRPCRouter({
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
      const user = await userAdminService.getUserProfile(input.id)

      if (!user) {
        throw new Error('User not found')
      }

      return user
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
})
