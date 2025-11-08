import { OrderStatus } from '@prisma/client'
import { OrderAdminService } from '../../src/server/services/OrderAdminService'

describe('OrderAdminService', () => {
  const service = new OrderAdminService()

  describe('validateStatusTransition', () => {
    it('should allow PENDING → PROCESSING', () => {
      const result = service.validateStatusTransition(
        OrderStatus.PENDING,
        OrderStatus.PROCESSING
      )
      expect(result.valid).toBe(true)
      expect(result.warning).toBeUndefined()
    })

    it('should reject DELIVERED → PENDING', () => {
      const result = service.validateStatusTransition(
        OrderStatus.DELIVERED,
        OrderStatus.PENDING
      )
      expect(result.valid).toBe(false)
    })

    it('should warn when cancelling shipped order', () => {
      const result = service.validateStatusTransition(
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED
      )
      expect(result.valid).toBe(true)
      expect(result.warning).toContain('in transit')
    })
  })
})
