import { z } from 'zod'
import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { adminService } from '~/server/services/AdminService'
import { invalidateCacheKey, invalidateCache } from '~/lib/cache'
import { TRPCError } from '@trpc/server'
import { OrderStatus } from '@repo/shared/types'

/**
 * Dashboard Router
 *
 * Admin dashboard metrics, orders, analytics, and inventory monitoring.
 * All endpoints require admin role verification via adminProcedure middleware.
 */
export const dashboardRouter = createTRPCRouter({
  /**
   * Get dashboard overview metrics
   *
   * Returns KPIs for admin dashboard: total sales, orders, products, users.
   * No input parameters - returns current state across all data.
   */
  getDashboardMetrics: adminProcedure.query(async () => {
    try {
      const metrics = await adminService.calculateDashboardMetrics()
      return metrics
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard metrics',
        cause: error,
      })
    }
  }),

  /**
   * Get recent orders with pagination
   *
   * Returns orders sorted by creation date (newest first).
   * Includes user info and order items for display in admin table.
   */
  getRecentOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10), // ← Prevent fetching too many
        page: z.number().min(1).default(1), // ← 1-indexed pages
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await adminService.fetchRecentOrders(
          input.limit,
          input.page
        )
        return result
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent orders',
          cause: error,
        })
      }
    }),

  /**
   * Get sales analytics for time period
   *
   * Returns time-series sales data for charts.
   * Supports daily, weekly, and monthly grouping with optional date range.
   */
  getSalesAnalytics: adminProcedure
    .input(
      z.object({
        period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
        startDate: z.date().optional(), // ← Optional filters
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const analytics = await adminService.calculateSalesAnalytics(
          input.period,
          input.startDate,
          input.endDate
        )
        return analytics
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sales analytics',
          cause: error,
        })
      }
    }),

  /**
   * Get products with low inventory
   *
   * Returns active products at or below threshold for restocking alerts.
   * Sorted by inventory level (lowest first).
   */
  getLowInventoryProducts: adminProcedure
    .input(
      z.object({
        threshold: z.number().min(0).default(10), // ← Configurable alert threshold
      })
    )
    .query(async ({ input }) => {
      try {
        const products = await adminService.fetchLowInventoryProducts(
          input.threshold
        )
        return products
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch low inventory products',
          cause: error,
        })
      }
    }),

  /**
   * Update order status (quick action)
   *
   * Allows admin to change order status from dashboard without full edit form.
   * Validates status enum to prevent invalid transitions.
   */
  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.cuid2(), // ← Validate CUID format
        status: z.enum(OrderStatus),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Update order status
        const updatedOrder = await ctx.prisma.order.update({
          where: { id: input.orderId },
          data: { status: input.status },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        // Invalidate affected caches
        // Run invalidations in parallel, but don't fail mutation if invalidation fails
        await Promise.all([
          invalidateCacheKey('admin:metrics'), // Dashboard KPIs affected
          invalidateCache('admin:analytics:*'), // Sales analytics affected (if DELIVERED)
          // Note: Don't invalidate orders list cache (we don't cache it)
        ]).catch((err) => {
          // Log but don't throw - cache invalidation failure is non-fatal
          console.error(
            '⚠️  Cache invalidation failed after order update:',
            err
          )
        })

        return updatedOrder
      } catch (error) {
        // Handle not found
        if (
          error instanceof Error &&
          error.message.includes('Record to update not found')
        ) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update order status',
          cause: error,
        })
      }
    }),
})
