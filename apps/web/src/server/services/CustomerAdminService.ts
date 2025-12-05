import { prisma } from '~/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Customer Admin Service
 *
 * Handles all customer-related business logic for admin panel.
 * Customers are Users with role='USER' who have placed orders or created accounts.
 */
export class CustomerAdminService {
  /**
   * Get paginated list of customers with optional search
   */
  async listCustomers({
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: {
    search?: string
    page?: number
    limit?: number
    sortBy?: 'name' | 'email' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
  }) {
    // Build where clause - only get USER role (customers, not admins)
    const where: Prisma.UserWhereInput = {
      role: 'USER',
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    // Execute queries in parallel
    const [totalCustomers, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return {
      customers,
      pagination: {
        total: totalCustomers,
        page,
        limit,
        totalPages: Math.ceil(totalCustomers / limit),
      },
    }
  }

  /**
   * Get detailed customer information by ID
   */
  async getCustomerById(customerId: string) {
    const customer = await prisma.user.findUnique({
      where: {
        id: customerId,
        role: 'USER', // Ensure we only fetch customers, not admins
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            cartItems: true,
          },
        },
      },
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Get the most recent order for shipping address reference
    const recentOrder = await prisma.order.findFirst({
      where: { userId: customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        shippingAddress: true,
      },
    })

    return {
      ...customer,
      // Extract shipping details from most recent order
      defaultAddress: recentOrder?.shippingAddress
        ? this.parseShippingAddress(recentOrder.shippingAddress)
        : null,
      // Add placeholder for phone - could be extracted from shipping address if stored there
      phone: recentOrder?.shippingAddress
        ? this.extractPhone(recentOrder.shippingAddress)
        : null,
    }
  }

  /**
   * Helper to parse shipping address JSON
   */
  private parseShippingAddress(shippingAddress: unknown) {
    if (
      typeof shippingAddress === 'object' &&
      shippingAddress !== null &&
      'street' in shippingAddress &&
      'city' in shippingAddress
    ) {
      return shippingAddress as {
        street: string
        city: string
        state?: string
        zip?: string
        country?: string
      }
    }
    return null
  }

  /**
   * Helper to extract phone from shipping address
   */
  private extractPhone(shippingAddress: unknown): string | null {
    if (
      typeof shippingAddress === 'object' &&
      shippingAddress !== null &&
      'phone' in shippingAddress &&
      typeof shippingAddress.phone === 'string'
    ) {
      return shippingAddress.phone
    }
    return null
  }
}
