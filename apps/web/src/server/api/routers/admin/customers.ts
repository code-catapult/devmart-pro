import { createTRPCRouter, adminProcedure } from '~/server/api/trpc'
import { CustomerAdminService } from '~/server/services/CustomerAdminService'
import { OrderAdminService } from '~/server/services/OrderAdminService'
import {
  customerListSchema,
  customerIdSchema,
  customerOrdersSchema,
  getCustomerOrderStatsSchema,
} from './schema'

// Instantiate services
const customerAdminService = new CustomerAdminService()
const orderAdminService = new OrderAdminService()

/**
 * Customers Router
 *
 * All customer management endpoints for admin panel.
 * Includes queries for viewing customers, their orders, and statistics.
 */
export const customersRouter = createTRPCRouter({
  // ==================== CUSTOMER QUERIES ====================

  /**
   * Get paginated list of customers with search
   */
  getCustomers: adminProcedure
    .input(customerListSchema)
    .query(async ({ input }) => {
      return await customerAdminService.listCustomers({
        search: input.search,
        page: input.page,
        limit: input.limit,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      })
    }),

  /**
   * Get single customer details by ID
   */
  getCustomerById: adminProcedure
    .input(customerIdSchema)
    .query(async ({ input }) => {
      return await customerAdminService.getCustomerById(input.id)
    }),

  // ==================== CUSTOMER ORDER QUERIES ====================

  /**
   * Get customer's order history with pagination and optional status filter
   */
  getOrders: adminProcedure
    .input(customerOrdersSchema)
    .query(async ({ input }) => {
      return await orderAdminService.getCustomerOrderHistory(
        input.userId,
        input.page,
        input.limit,
        input.status
      )
    }),

  /**
   * Get customer's order statistics
   */
  getOrderStats: adminProcedure
    .input(getCustomerOrderStatsSchema)
    .query(async ({ input, ctx }) => {
      const { customerId } = input

      // Aggregate customer order statistics
      const [totalOrders, orderStats, pendingOrders] = await Promise.all([
        ctx.prisma.order.count({
          where: { userId: customerId },
        }),
        ctx.prisma.order.aggregate({
          where: { userId: customerId },
          _sum: { total: true },
          _count: true,
        }),
        ctx.prisma.order.count({
          where: {
            userId: customerId,
            status: { in: ['PENDING', 'PROCESSING'] },
          },
        }),
      ])

      const completedOrders = await ctx.prisma.order.count({
        where: {
          userId: customerId,
          status: 'DELIVERED',
        },
      })

      const totalSpent = orderStats._sum.total || 0
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

      return {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalSpent,
        averageOrderValue,
      }
    }),
})
