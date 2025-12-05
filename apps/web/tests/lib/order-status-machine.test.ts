import { OrderStatus } from '@prisma/client'
import {
  isValidTransition,
  getValidNextStatuses,
  requiresConfirmation,
  getTransitionError,
} from '../../src/lib/order-status-machine'

describe('Order Status State Machine', () => {
  describe('isValidTransition', () => {
    // Valid transitions from PENDING
    it('allows PENDING → PROCESSING', () => {
      expect(
        isValidTransition(OrderStatus.PENDING, OrderStatus.PROCESSING)
      ).toBe(true)
    })

    it('allows PENDING → CANCELLED', () => {
      expect(
        isValidTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)
      ).toBe(true)
    })

    it('rejects PENDING → DELIVERED', () => {
      expect(
        isValidTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)
      ).toBe(false)
    })

    // Valid transitions from PROCESSING
    it('allows PROCESSING → SHIPPED', () => {
      expect(
        isValidTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)
      ).toBe(true)
    })

    it('allows PROCESSING → CANCELLED', () => {
      expect(
        isValidTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)
      ).toBe(true)
    })

    it('rejects PROCESSING → PENDING', () => {
      expect(
        isValidTransition(OrderStatus.PROCESSING, OrderStatus.PENDING)
      ).toBe(false)
    })

    // Valid transitions from SHIPPED
    it('allows SHIPPED → DELIVERED', () => {
      expect(
        isValidTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)
      ).toBe(true)
    })

    it('allows SHIPPED → CANCELLED (with warning)', () => {
      expect(
        isValidTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)
      ).toBe(true)
    })

    it('rejects SHIPPED → PENDING', () => {
      expect(isValidTransition(OrderStatus.SHIPPED, OrderStatus.PENDING)).toBe(
        false
      )
    })

    // Terminal states
    it('rejects all transitions from DELIVERED', () => {
      expect(
        isValidTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.DELIVERED, OrderStatus.PROCESSING)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.DELIVERED, OrderStatus.SHIPPED)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)
      ).toBe(false)
    })

    it('rejects all transitions from CANCELLED', () => {
      expect(
        isValidTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.CANCELLED, OrderStatus.PROCESSING)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.CANCELLED, OrderStatus.SHIPPED)
      ).toBe(false)
      expect(
        isValidTransition(OrderStatus.CANCELLED, OrderStatus.DELIVERED)
      ).toBe(false)
    })
  })

  describe('getValidNextStatuses', () => {
    it('returns valid statuses for PENDING', () => {
      const valid = getValidNextStatuses(OrderStatus.PENDING)
      expect(valid).toContain(OrderStatus.PROCESSING)
      expect(valid).toContain(OrderStatus.CANCELLED)
      expect(valid).toHaveLength(2)
    })

    it('returns empty array for DELIVERED', () => {
      const valid = getValidNextStatuses(OrderStatus.DELIVERED)
      expect(valid).toHaveLength(0)
    })

    it('returns empty array for CANCELLED', () => {
      const valid = getValidNextStatuses(OrderStatus.CANCELLED)
      expect(valid).toHaveLength(0)
    })
  })

  describe('requiresConfirmation', () => {
    it('requires confirmation for SHIPPED → CANCELLED', () => {
      expect(
        requiresConfirmation(OrderStatus.SHIPPED, OrderStatus.CANCELLED)
      ).toBe(true)
    })

    it('does not require confirmation for safe transitions', () => {
      expect(
        requiresConfirmation(OrderStatus.PENDING, OrderStatus.PROCESSING)
      ).toBe(false)
      expect(
        requiresConfirmation(OrderStatus.PROCESSING, OrderStatus.SHIPPED)
      ).toBe(false)
      expect(
        requiresConfirmation(OrderStatus.SHIPPED, OrderStatus.DELIVERED)
      ).toBe(false)
    })
  })

  describe('getTransitionError', () => {
    it('returns specific error for DELIVERED terminal state', () => {
      const error = getTransitionError(
        OrderStatus.DELIVERED,
        OrderStatus.PENDING
      )
      expect(error).toContain('refund system')
    })

    it('returns specific error for CANCELLED terminal state', () => {
      const error = getTransitionError(
        OrderStatus.CANCELLED,
        OrderStatus.PROCESSING
      )
      expect(error).toContain('Create a new order')
    })

    it('returns specific error for invalid backward transition', () => {
      const error = getTransitionError(OrderStatus.SHIPPED, OrderStatus.PENDING)
      expect(error).toContain('already in transit')
    })
  })
})
