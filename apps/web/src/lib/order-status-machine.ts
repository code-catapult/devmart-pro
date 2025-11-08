import { OrderStatus } from '@repo/shared/types'

/**
 * Order Status State Machine
 *
 * Single source of truth for valid order status transitions.
 * Used by both server-side validation and client-side UI filtering.
 *
 * Status Transition Matrix
 *
 * Defines valid transitions between order statuses.
 * This is the single source of truth for business rules.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // PENDING: Payment pending or confirmed
  PENDING: [
    OrderStatus.PROCESSING, // Payment confirmed, start processing
    OrderStatus.CANCELLED, // Customer cancels before processing
  ],

  // PROCESSING: Preparing order for shipment
  PROCESSING: [
    OrderStatus.SHIPPED, // Package handed to carrier
    OrderStatus.CANCELLED, // Issue found, cancel order
  ],

  // SHIPPED: Package with carrier, in transit
  SHIPPED: [
    OrderStatus.DELIVERED, // Carrier confirms delivery
    OrderStatus.CANCELLED, // Customer refuses delivery (rare)
  ],

  // DELIVERED: Customer received package (terminal state)
  DELIVERED: [], // No transitions - use refund for returns

  // CANCELLED: Order cancelled (terminal state)
  CANCELLED: [], // No transitions - cancelled is final
}

/**
 * Transitions that require confirmation (potentially dangerous)
 */
export const DANGEROUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.SHIPPED]: [OrderStatus.CANCELLED],
  // Cancelling shipped order is risky - package may still arrive
}

/**
 * Validate if transition from current status to new status is allowed
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
  return allowedTransitions.includes(newStatus)
}

/**
 * Check if transition requires confirmation
 */
export function requiresConfirmation(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const dangerous = DANGEROUS_TRANSITIONS[currentStatus] || []
  return dangerous.includes(newStatus)
}

/**
 * Get user-friendly error message for invalid transition
 */
export function getTransitionError(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): string {
  // Terminal states
  if (currentStatus === OrderStatus.DELIVERED) {
    return 'Cannot change status of delivered orders. Use the refund system to process returns.'
  }

  if (currentStatus === OrderStatus.CANCELLED) {
    return 'Cannot change status of cancelled orders. Create a new order instead.'
  }

  // Specific invalid transitions
  const key = `${currentStatus}->${newStatus}`
  const messages: Record<string, string> = {
    'SHIPPED->PENDING':
      'Cannot mark shipped order as pending. Order is already in transit.',
    'SHIPPED->PROCESSING':
      'Cannot reprocess shipped order. Order is already with carrier.',
    'DELIVERED->PENDING':
      'Cannot mark delivered order as pending. Order was already received.',
    'DELIVERED->PROCESSING':
      'Cannot reprocess delivered order. Order was already received.',
    'DELIVERED->SHIPPED':
      'Cannot mark delivered order as shipped again. Order was already received.',
  }

  return (
    messages[key] ||
    `Cannot transition from ${currentStatus} to ${newStatus}. Invalid status change.`
  )
}

/**
 * Get warning message for dangerous transitions
 */
export function getTransitionWarning(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): string | null {
  if (
    currentStatus === OrderStatus.SHIPPED &&
    newStatus === OrderStatus.CANCELLED
  ) {
    return 'Package may already be in transit. Customer might still receive it. Consider processing a refund after delivery instead.'
  }

  return null
}

/**
 * Get list of valid next statuses for current status
 */
export function getValidNextStatuses(
  currentStatus: OrderStatus
): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || []
}
