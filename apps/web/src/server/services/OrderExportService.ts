import { prisma } from '~/lib/prisma'
import { type Prisma, type OrderStatus } from '@prisma/client'

export interface ExportFilters {
  status?: OrderStatus
  startDate?: Date
  endDate?: Date
  search?: string
}

// Full order with relations for export
type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: { select: { name: true; email: true; id: true } }
    orderItems: { include: { product: { select: { name: true; sku: true } } } }
  }
}>

export class OrderExportService {
  /**
   * Stream orders as CSV rows (memory-efficient for large datasets)
   * Returns async generator that yields CSV rows one at a time
   */
  async *streamOrdersAsCSV(filters: ExportFilters): AsyncGenerator<string> {
    // Build where clause from filters
    const where = this.buildWhereClause(filters)

    // Yield CSV header row first
    yield this.getCSVHeader() + '\n'

    // Cursor-based pagination (fetch in batches to avoid loading all at once)
    const batchSize = 100 // Fetch 100 orders at a time
    let skip = 0
    let hasMore = true

    while (hasMore) {
      // Fetch batch of orders
      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          orderItems: {
            include: {
              product: {
                select: { name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: batchSize,
      })

      // If batch is smaller than batchSize, this is the last batch
      hasMore = orders.length === batchSize
      skip += batchSize

      // Yield each order as CSV row
      for (const order of orders) {
        yield this.formatOrderAsCSVRow(order) + '\n'
      }
    }
  }

  /**
   * Export orders to CSV string (for small datasets, < 1000 orders)
   */
  async exportToCSVString(filters: ExportFilters): Promise<string> {
    const where = this.buildWhereClause(filters)

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        orderItems: {
          include: {
            product: {
              select: { name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent memory issues
    })

    // Build CSV string
    const rows = [this.getCSVHeader()]
    orders.forEach((order) => {
      rows.push(this.formatOrderAsCSVRow(order))
    })

    return rows.join('\n')
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: ExportFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = filters.startDate
      if (filters.endDate) where.createdAt.lte = filters.endDate
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ]
    }

    return where
  }

  /**
   * Get CSV header row
   */
  private getCSVHeader(): string {
    return [
      'Order Number',
      'Order Date',
      'Status',
      'Customer Name',
      'Customer Email',
      'Items Count',
      'Item Details',
      'Product SKUs',
      'Subtotal',
      'Shipping',
      'Tax',
      'Total',
      'Payment Intent ID',
      'Tracking Number',
      'Shipping Carrier',
      'Refund Amount',
      'Refund Reason',
    ].join(',')
  }

  /**
   * Format single order as CSV row
   */
  private formatOrderAsCSVRow(order: OrderWithRelations): string {
    // Calculate totals
    const itemsCount = order.orderItems.length

    // Format item details (product name x quantity)
    const itemDetails = order.orderItems
      .map((item) => `${item.product.name} x${item.quantity}`)
      .join('; ')

    // Product SKUs
    const productSKUs = order.orderItems
      .map((item) => item.product.sku || 'N/A')
      .join('; ')

    // Escape CSV values (handle commas and quotes)
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    return [
      escape(order.orderNumber),
      escape(order.createdAt.toISOString().split('T')[0]), // Date only
      escape(order.status),
      escape(order.user.name || ''),
      escape(order.user.email),
      escape(itemsCount),
      escape(itemDetails),
      escape(productSKUs),
      escape((order.subtotal / 100).toFixed(2)), // Convert cents to dollars
      escape((order.shipping / 100).toFixed(2)),
      escape((order.tax / 100).toFixed(2)),
      escape((order.total / 100).toFixed(2)),
      escape(order.stripePaymentIntentId || ''),
      escape(order.trackingNumber || ''),
      escape(order.shippingCarrier || ''),
      escape(order.refundAmount ? (order.refundAmount / 100).toFixed(2) : ''),
      escape(order.refundReason || ''),
    ].join(',')
  }
}
