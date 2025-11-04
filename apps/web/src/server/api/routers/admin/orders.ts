import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { OrderAdminService } from '~/server/services/OrderAdminService'
import { RefundService } from '~/server/services/RefundService'
import { OrderAnalyticsService } from '~/server/services/OrderAnalyticsService'
import type { OrderStatus } from '@prisma/client'
import {
  orderListSchema,
  orderIdSchema,
  customerOrdersSchema,
  orderAnalyticsSchema,
  updateOrderStatusSchema,
  addTrackingInfoSchema,
  updateTrackingInfoSchema,
  processRefundSchema,
  bulkUpdateOrderStatusSchema,
} from './schema'

// Instantiate services
const orderAdminService = new OrderAdminService()
const refundService = new RefundService()
const orderAnalyticsService = new OrderAnalyticsService()

/**
 * Orders Router
 *
 * All order management endpoints for admin panel.
 * Includes queries for listing/viewing orders and mutations for status updates, refunds, and bulk operations.
 */
export const ordersRouter = createTRPCRouter({
  // ==================== ORDER MANAGEMENT QUERIES ====================

  getOrders: adminProcedure.input(orderListSchema).query(async ({ input }) => {
    // Delegate to service layer for complex query logic
    return await orderAdminService.listOrders({
      search: input.search,
      status:
        input.status === 'ALL' ? undefined : (input.status as OrderStatus), // Convert "ALL" to undefined
      startDate: input.startDate,
      endDate: input.endDate,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      page: input.page,
      limit: input.limit,
    })
  }),

  getOrderById: adminProcedure.input(orderIdSchema).query(async ({ input }) => {
    return await orderAdminService.getOrderDetails(input.id)
  }),

  getCustomerOrders: adminProcedure
    .input(customerOrdersSchema)
    .query(async ({ input }) => {
      return await orderAdminService.getCustomerOrderHistory(
        input.userId,
        input.page,
        input.limit
      )
    }),

  getOrderAnalytics: adminProcedure
    .input(orderAnalyticsSchema)
    .query(async ({ input }) => {
      return await orderAnalyticsService.getOrderStatistics({
        startDate: input.startDate,
        endDate: input.endDate,
        period: input.period,
      })
    }),

  // ==================== ORDER MANAGEMENT MUTATIONS ====================

  updateOrderStatus: adminProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ input, ctx }) => {
      return await orderAdminService.updateStatus(
        input.orderId,
        input.status as OrderStatus,
        ctx.session.user.id, // Pass admin user ID for audit logging
        input.notes
      )
    }),

  addTrackingInfo: adminProcedure
    .input(addTrackingInfoSchema)
    .mutation(async ({ input, ctx }) => {
      return await orderAdminService.addShippingTracking({
        orderId: input.orderId,
        trackingNumber: input.trackingNumber,
        shippingCarrier: input.shippingCarrier,
        estimatedDelivery: input.estimatedDelivery,
        adminUserId: ctx.session.user.id,
      })
    }),

  processRefund: adminProcedure
    .input(processRefundSchema)
    .mutation(async ({ input, ctx }) => {
      return await refundService.processRefund({
        orderId: input.orderId,
        amount: input.amount,
        reason: input.reason,
        notes: input.notes,
        adminUserId: ctx.session.user.id,
      })
    }),

  bulkUpdateOrderStatus: adminProcedure
    .input(bulkUpdateOrderStatusSchema)
    .mutation(async ({ input, ctx }) => {
      return await orderAdminService.bulkUpdateStatus(
        input.orderIds,
        input.status as OrderStatus,
        ctx.session.user.id
      )
    }),

  updateShippingTracking: adminProcedure
    .input(updateTrackingInfoSchema)
    .mutation(async ({ input, ctx }) => {
      return await orderAdminService.updateShippingTracking({
        orderId: input.orderId,
        trackingNumber: input.trackingNumber,
        shippingCarrier: input.shippingCarrier,
        estimatedDelivery: input.estimatedDelivery,
        adminUserId: ctx.session.user.id,
      })
    }),
})
