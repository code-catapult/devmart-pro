import { prisma } from '~/lib/prisma'
import { formatCurrency, formatDateTime } from '@repo/shared/utils'
import { type Prisma, type OrderStatus } from '@prisma/client'
import { ShippingAddress } from '@repo/shared/types'

export interface ExportFilters {
  status?: OrderStatus | 'ALL'
  startDate?: Date
  endDate?: Date
  search?: string
  cursor?: string
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
        yield this.formatOrderAsCSV(order) + '\n'
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
      rows.push(this.formatOrderAsCSV(order))
    })

    return rows.join('\n')
  }

  async getOrdersForExport(filters: ExportFilters) {
    const { status, startDate, endDate, search, cursor } = filters

    const where: Prisma.OrderWhereInput = {
      ...(status && status !== 'ALL' && { status: status as OrderStatus }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    }

    // Fetch batch of orders (100 at a time for streaming)
    const orders = await prisma.order.findMany({
      where,
      take: 100, // Batch size
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Resume from cursor
      orderBy: { createdAt: 'desc' },
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
    })

    return orders
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: ExportFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {}

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status as OrderStatus
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
   * Escape CSV field - wrap in quotes if contains comma, quote, or newline
   */
  private escapeCSVField(field: string | number | null | undefined): string {
    if (field === null || field === undefined) return ''

    const str = String(field)

    // If field contains comma, quote, or newline → wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      // Replace " with "" (CSV escape for quotes)
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  /**
   * Get CSV header row
   */
  private getCSVHeader(): string {
    const headers = [
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
      'Shipping Address',
      'Refund Amount',
      'Refund Reason',
    ]

    return headers.map((h) => this.escapeCSVField(h)).join(',') + '\n'
  }

  /**
   * Format single order as CSV row
   */

  formatOrderAsCSV(order: OrderWithRelations): string {
    const {
      orderNumber,
      createdAt,
      user,
      orderItems,
      subtotal,
      tax,
      shipping,
      total,
      status,
      trackingNumber,
      shippingCarrier,
      shippingAddress,
      stripePaymentIntentId,
      refundAmount,
      refundReason,
    } = order

    // Format item details (product name x quantity)
    const itemDetails = orderItems
      .map((item) => `${item.product.name} x${item.quantity}`)
      .join('; ')

    // Product SKUs
    const productSKUs = orderItems
      .map((item) => item.product.sku || 'N/A')
      .join('; ')

    // Format shipping address as single line
    const addressLine = shippingAddress
      ? (() => {
          const addr = shippingAddress as unknown as ShippingAddress
          return `${addr.address1}, ${addr.city}, ${addr.state} ${addr.postalCode}`
        })()
      : ''

    const fields = [
      orderNumber,
      formatDateTime(createdAt),
      status,
      user.name || '',
      user.email,
      orderItems.length.toString(),
      itemDetails,
      productSKUs,
      formatCurrency(subtotal),
      formatCurrency(shipping),
      formatCurrency(tax),
      formatCurrency(total),
      stripePaymentIntentId || '',
      trackingNumber || '',
      shippingCarrier || '',
      addressLine,
      refundAmount ? formatCurrency(refundAmount) : '',
      refundReason || '',
    ]

    return fields.map((f) => this.escapeCSVField(f)).join(',') + '\n'
  }

  async *generateCSV(filters: ExportFilters): AsyncGenerator<string> {
    // Yield header first
    yield this.getCSVHeader()

    let cursor: string | undefined = undefined
    let hasMore = true

    // Stream batches until no more data
    while (hasMore) {
      const orders = await this.getOrdersForExport({
        ...filters,
        cursor,
      })

      // No more orders → stop
      if (orders.length === 0) {
        hasMore = false
        break
      }

      // Yield each order as CSV row
      for (const order of orders) {
        yield this.formatOrderAsCSV(order)
      }

      // Set cursor to last order's ID for next batch
      cursor = orders[orders.length - 1].id

      // If we got less than batch size → we're done
      if (orders.length < 100) {
        hasMore = false
      }
    }
  }
}
