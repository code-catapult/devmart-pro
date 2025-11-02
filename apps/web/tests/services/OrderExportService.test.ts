import { OrderExportService } from '~/server/services/OrderExportService'

describe('OrderExportService', () => {
  const service = new OrderExportService()

  describe('CSV escaping', () => {
    it('should wrap values with commas in quotes', () => {
      const order = {
        orderNumber: 'ORD-001',
        user: { name: 'Smith, John', email: 'john@example.com' },
        orderItems: [{ product: { name: 'Widget' }, quantity: 1, price: 1000 }],
        total: 1000,
        createdAt: new Date('2025-01-01'),
        status: 'DELIVERED',
      }

      const row = service['formatOrderAsCSVRow'](order as any)

      // Customer name should be quoted due to comma
      expect(row).toContain('"Smith, John"')
    })

    it('should escape quotes in values', () => {
      const order = {
        orderNumber: 'ORD-002',
        user: { name: 'John "Johnny" Smith', email: 'john@example.com' },
        orderItems: [{ product: { name: 'Widget' }, quantity: 1, price: 1000 }],
        total: 1000,
        createdAt: new Date('2025-01-01'),
        status: 'DELIVERED',
      }

      const row = service['formatOrderAsCSVRow'](order as any)

      // Quotes should be doubled
      expect(row).toContain('"John ""Johnny"" Smith"')
    })
  })
})
