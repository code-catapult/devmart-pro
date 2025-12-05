'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import {
  Clock,
  Package,
  CreditCard,
  Truck,
  CheckCircle,
  DollarSign,
  MessageSquare,
  User,
  Home,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface OrderTimelineProps {
  events: TimelineEvent[]
}

interface TimelineEvent {
  id: string
  type: EventType
  timestamp: Date
  title: string
  description?: string
  user?: {
    name: string | null
    email: string
  }
  metadata?: Record<string, unknown>
}

type EventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'STATUS_CHANGED'
  | 'TRACKING_ADDED'
  | 'REFUND_PROCESSED'
  | 'NOTE_ADDED'

/**
 * OrderTimeline Component
 *
 * Displays chronological order events with visual timeline.
 * Shows status changes, tracking updates, refunds, and notes.
 */
export function OrderTimeline({ events }: OrderTimelineProps) {
  // Sort events chronologically (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No timeline events yet.
          </p>
        ) : (
          <div className="relative">
            {/* Events */}
            <div className="space-y-6">
              {sortedEvents.map((event, index) => (
                <TimelineEventItem
                  key={event.id}
                  event={event}
                  isLast={index === sortedEvents.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Single timeline event item
 */
function TimelineEventItem({
  event,
  isLast,
}: {
  event: TimelineEvent
  isLast: boolean
}) {
  const icon = getEventIcon(event)
  const color = getEventColor(event)

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Icon Circle */}
      <div
        className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white ${color}`}
      >
        {icon}
      </div>

      {/* Connecting line to next event (hide for last item) */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Event Content */}
      <div className="flex-1 pt-1">
        {/* Title and Time */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-sm">{event.title}</p>
            {event.description && (
              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
            )}
          </div>
          <p className="text-xs text-gray-500 whitespace-nowrap">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </p>
        </div>

        {/* User Attribution */}
        {event.user && (
          <div className="flex items-center gap-2 mt-2">
            <User className="h-3 w-3 text-gray-400" />
            <p className="text-xs text-gray-500">
              {event.user.name || event.user.email}
            </p>
          </div>
        )}

        {/* Metadata (for tracking, refunds, etc.) */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Get icon for event type
 */
function getEventIcon(event: TimelineEvent) {
  const iconClass = 'h-5 w-5 text-white'

  // For status changes, use specific icons based on the new status
  if (event.type === 'STATUS_CHANGED' && event.metadata?.newStatus) {
    const newStatus = event.metadata.newStatus as string

    switch (newStatus) {
      case 'PROCESSING':
        return <Package className={iconClass} />
      case 'SHIPPED':
        return <Truck className={iconClass} />
      case 'DELIVERED':
        return <Home className={iconClass} />
      case 'CANCELLED':
        return <DollarSign className={iconClass} />
      default:
        return <CheckCircle className={iconClass} />
    }
  }

  // Default icons for other event types
  switch (event.type) {
    case 'ORDER_CREATED':
      return <Package className={iconClass} />
    case 'PAYMENT_CONFIRMED':
      return <CreditCard className={iconClass} />
    case 'STATUS_CHANGED':
      return <CheckCircle className={iconClass} />
    case 'TRACKING_ADDED':
      return <Truck className={iconClass} />
    case 'REFUND_PROCESSED':
      return <DollarSign className={iconClass} />
    case 'NOTE_ADDED':
      return <MessageSquare className={iconClass} />
    default:
      return <Clock className={iconClass} />
  }
}

/**
 * Get background color for event type
 */
function getEventColor(event: TimelineEvent): string {
  // For status changes, use specific colors based on the new status
  if (event.type === 'STATUS_CHANGED' && event.metadata?.newStatus) {
    const newStatus = event.metadata.newStatus as string

    switch (newStatus) {
      case 'PROCESSING':
        return 'bg-blue-500'
      case 'SHIPPED':
        return 'bg-orange-500'
      case 'DELIVERED':
        return 'bg-green-500'
      case 'CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-purple-500'
    }
  }

  // Default colors for other event types
  switch (event.type) {
    case 'ORDER_CREATED':
      return 'bg-blue-500'
    case 'PAYMENT_CONFIRMED':
      return 'bg-green-500'
    case 'STATUS_CHANGED':
      return 'bg-purple-500'
    case 'TRACKING_ADDED':
      return 'bg-orange-500'
    case 'REFUND_PROCESSED':
      return 'bg-red-500'
    case 'NOTE_ADDED':
      return 'bg-gray-500'
    default:
      return 'bg-gray-400'
  }
}
