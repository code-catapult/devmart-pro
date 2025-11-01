import { RefundService } from '~/server/services/RefundService'

// Mock the Stripe module to avoid fetch() errors in test environment
jest.mock('~/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: jest.fn(),
    },
  },
}))

describe('RefundService', () => {
  const service = new RefundService()

  describe('calculateRefundAmount', () => {
    it('should return full amount when amount = 0', () => {
      const order = { total: 10000, refundAmount: null }
      const result = service.calculateRefundAmount(order, 0)
      expect(result).toBe(10000)
    })

    it('should return remaining after partial refund', () => {
      const order = { total: 10000, refundAmount: 3000 }
      const result = service.calculateRefundAmount(order, 0)
      expect(result).toBe(7000) // $100 - $30 = $70 remaining
    })

    it('should return requested amount if within remaining', () => {
      const order = { total: 10000, refundAmount: 3000 }
      const result = service.calculateRefundAmount(order, 2000)
      expect(result).toBe(2000)
    })
  })
})
