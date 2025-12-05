import { prisma } from '~/lib/prisma'
import { generateCSV, type CSVColumn } from '~/lib/csv'
import { generateExcel, type ExcelColumn, type ExcelSheet } from '~/lib/excel'
import { formatCurrency } from '@repo/shared/utils'

/**
 * UserExportService
 *
 * Handles user data export functionality for admin users.
 *
 * FEATURES:
 * - User list export (CSV/Excel)
 * - GDPR user data export (complete profile)
 * - Column selection
 * - Data formatting
 *
 * PERFORMANCE:
 * - Batch processing for large datasets
 * - Efficient database queries
 * - Minimal memory footprint
 */

class UserExportService {
  // ============================================
  // AVAILABLE EXPORT COLUMNS
  // ============================================

  private readonly AVAILABLE_COLUMNS = {
    name: {
      key: 'name',
      label: 'Name',
      alwaysInclude: true,
      format: (value: string | null) => value || 'No name',
    },
    email: {
      key: 'email',
      label: 'Email',
      alwaysInclude: true,
    },
    role: {
      key: 'role',
      label: 'Role',
      alwaysInclude: false,
    },
    suspended: {
      key: 'suspended',
      label: 'Suspended',
      alwaysInclude: false,
      format: (value: boolean) => (value ? 'Yes' : 'No'),
    },
    createdAt: {
      key: 'createdAt',
      label: 'Join Date',
      alwaysInclude: false,
      format: (value: Date) => value.toISOString().split('T')[0], // YYYY-MM-DD
    },
    lastLoginAt: {
      key: 'lastLoginAt',
      label: 'Last Login',
      alwaysInclude: false,
      format: (value: Date | null) =>
        value ? value.toISOString().split('T')[0] : 'Never',
    },
    totalSpent: {
      key: 'totalSpent',
      label: 'Total Spent',
      alwaysInclude: false,
      format: (value: number) => formatCurrency(value),
    },
    orderCount: {
      key: 'orderCount',
      label: 'Order Count',
      alwaysInclude: false,
    },
  } as const

  // ============================================
  // EXPORT USER LIST
  // ============================================

  /**
   * Export user list to CSV or Excel format.
   *
   * @param format - Export format ("csv" or "excel")
   * @param columns - Array of column keys to include
   * @param filters - Optional filters (same as user list page)
   * @returns Buffer or string depending on format
   */
  async exportUserList(
    format: 'csv' | 'excel',
    columns: string[],
    filters?: {
      search?: string
      role?: 'ALL' | 'USER' | 'ADMIN'
      status?: 'ALL' | 'ACTIVE' | 'SUSPENDED'
    }
  ) {
    // ============================================
    // BUILD DATABASE QUERY
    // ============================================

    interface WhereClause {
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        email?: { contains: string; mode: 'insensitive' }
      }>
      role?: 'USER' | 'ADMIN'
      suspended?: boolean
    }

    const where: WhereClause = {}

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters?.role && filters.role !== 'ALL') {
      where.role = filters.role
    }

    if (filters?.status) {
      if (filters.status === 'ACTIVE') {
        where.suspended = false
      } else if (filters.status === 'SUSPENDED') {
        where.suspended = true
      }
    }

    // ============================================
    // FETCH USERS WITH AGGREGATED DATA
    // ============================================

    /**
     * Fetch users in a single query with aggregated order data.
     * This is more efficient than fetching users + orders separately.
     */
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspended: true,
        createdAt: true,
        orders: {
          where: { status: 'DELIVERED' },
          select: {
            total: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      // Limit to prevent memory issues (for very large exports, use streaming)
      take: 10000,
    })

    // ============================================
    // CALCULATE AGGREGATED FIELDS
    // ============================================

    const processedUsers = users.map((user) => ({
      ...user,
      totalSpent: user.orders.reduce(
        (sum: number, order) => sum + order.total,
        0
      ),
      orderCount: user._count.orders,
      lastLoginAt: null, // Field doesn't exist in schema yet
      orders: undefined, // Remove raw orders from export
      _count: undefined, // Remove count object
    }))

    // ============================================
    // FILTER COLUMNS
    // ============================================

    /**
     * Only include selected columns + always-included columns.
     */
    const availableColumns = this.AVAILABLE_COLUMNS
    const selectedColumns = Object.keys(availableColumns)
      .filter((key) => {
        const col = availableColumns[key as keyof typeof availableColumns]
        return col.alwaysInclude || columns.includes(key)
      })
      .map((key) => availableColumns[key as keyof typeof availableColumns])

    // ============================================
    // GENERATE EXPORT
    // ============================================

    if (format === 'csv') {
      const csvColumns: CSVColumn[] = selectedColumns.map((col) => ({
        key: col.key,
        label: col.label,
        format:
          'format' in col
            ? (col.format as (value: unknown) => string)
            : undefined,
      }))

      return generateCSV(processedUsers, csvColumns)
    } else {
      const excelColumns: ExcelColumn[] = selectedColumns.map((col) => ({
        key: col.key,
        label: col.label,
        width: col.key === 'email' ? 40 : 20,
        format: col.key === 'totalSpent' ? '$#,##0.00' : undefined,
      }))

      const sheets: ExcelSheet<(typeof processedUsers)[0]>[] = [
        {
          name: 'Users',
          data: processedUsers,
          columns: excelColumns,
        },
      ]

      return await generateExcel(sheets)
    }
  }

  // ============================================
  // GDPR USER DATA EXPORT
  // ============================================

  /**
   * Export complete user data for GDPR compliance.
   *
   * Includes:
   * - Personal information
   * - Account data
   * - Order history
   * - Support notes
   * - Activity logs
   *
   * @param userId - User ID to export data for
   * @returns JSON object with complete user data
   */
  async exportUserDataGDPR(userId: string) {
    /**
     * Fetch ALL user data in a single parallel query.
     */
    const [user, orders, supportNotes, activityLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          suspended: true,
          suspendedAt: true,
          suspensionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.supportNote.findMany({
        where: { userId },
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!user) {
      throw new Error('User not found')
    }

    // ============================================
    // BUILD GDPR DATA PACKAGE
    // ============================================

    return {
      export_metadata: {
        exported_at: new Date().toISOString(),
        data_format: 'JSON',
        gdpr_article: 'Article 20 - Right to data portability',
        user_id: userId,
      },
      personal_information: {
        name: user.name,
        email: user.email,
      },
      account_data: {
        user_id: user.id,
        role: user.role,
        account_created: user.createdAt.toISOString(),
        last_updated: user.updatedAt.toISOString(),
        last_login: null, // Field doesn't exist in schema yet
        suspended: user.suspended,
        suspended_at: user.suspendedAt?.toISOString() || null,
        suspension_reason: user.suspensionReason,
      },
      order_history: orders.map((order) => ({
        order_number: order.orderNumber,
        order_date: order.createdAt.toISOString(),
        status: order.status,
        total: order.total,
        items: order.orderItems.map((item) => ({
          product_name: item.product.name,
          product_description: item.product.description,
          quantity: item.quantity,
          price: item.price,
        })),
      })),
      support_interactions: supportNotes.map((note) => ({
        date: note.createdAt.toISOString(),
        content: note.content,
        admin_name: note.admin.name || 'Unknown',
      })),
      activity_logs: activityLogs.map((log) => ({
        timestamp: log.createdAt.toISOString(),
        action: log.action,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        metadata: log.metadata,
      })),
    }
  }

  // ============================================
  // GET AVAILABLE COLUMNS
  // ============================================

  /**
   * Get list of available columns for export.
   * Used by frontend to build column selection UI.
   */
  getAvailableColumns() {
    return Object.entries(this.AVAILABLE_COLUMNS).map(([key, col]) => ({
      key,
      label: col.label,
      alwaysInclude: col.alwaysInclude,
    }))
  }
}

export const userExportService = new UserExportService()
