'use client'

import { useState } from 'react'
import { OverviewTab } from './OverviewTab'
import { OrdersTab } from './OrdersTab'
import { ActivityTab } from './ActivityTab'
import { NotesTab } from './NotesTab'
import type {
  OrderSummary,
  ActivityLogEntry,
  SupportNoteItem,
} from '@repo/shared/types'

/**
 * ProfileTabs Component
 *
 * Manages tabbed interface for different data views.
 *
 * TABS:
 * 1. Overview - Summary stats and highlights
 * 2. Orders - Order history with filtering
 * 3. Activity - Activity log timeline
 * 4. Notes - Support notes with creation
 *
 * MOBILE OPTIMIZATION:
 * - Desktop: Horizontal tab buttons
 * - Mobile: Dropdown select
 *
 * This component uses local state for tab switching,
 * which is faster than URL-based state for this use case.
 */

interface ProfileTabsProps {
  userId: string
  initialData: {
    orders: OrderSummary[]
    activity: ActivityLogEntry[]
    notes: SupportNoteItem[]
  }
}

type TabName = 'overview' | 'orders' | 'activity' | 'notes'

export function ProfileTabs({ userId, initialData }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>('overview')

  // ============================================
  // TAB CONFIGURATION
  // ============================================

  const tabs = [
    { id: 'overview' as TabName, label: 'Overview', count: null },
    {
      id: 'orders' as TabName,
      label: 'Orders',
      count: initialData.orders.length,
    },
    {
      id: 'activity' as TabName,
      label: 'Activity',
      count: initialData.activity.length,
    },
    { id: 'notes' as TabName, label: 'Notes', count: initialData.notes.length },
  ]

  // ============================================
  // RENDER TAB CONTENT
  // ============================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab userId={userId} initialData={initialData} />
      case 'orders':
        return <OrdersTab userId={userId} initialOrders={initialData.orders} />
      case 'activity':
        return (
          <ActivityTab userId={userId} initialActivity={initialData.activity} />
        )
      case 'notes':
        return <NotesTab userId={userId} initialNotes={initialData.notes} />
      default:
        return null
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* ============================================ */}
      {/* DESKTOP: Horizontal Tabs */}
      {/* ============================================ */}
      <div className="hidden md:flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2
              px-6 py-4
              text-sm font-medium
              border-b-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={`
                  inline-flex items-center justify-center
                  rounded-full px-2 py-0.5
                  text-xs font-semibold
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================ */}
      {/* MOBILE: Dropdown */}
      {/* ============================================ */}
      <div className="md:hidden border-b border-gray-200 px-4 py-3">
        <label htmlFor="tab-select" className="sr-only">
          Select tab
        </label>
        <select
          id="tab-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabName)}
          className="
            block w-full rounded-lg border border-gray-300 bg-white
            px-4 py-2
            text-sm font-medium text-gray-900
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
            min-h-[44px]
          "
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
              {tab.count !== null && ` (${tab.count})`}
            </option>
          ))}
        </select>
      </div>

      {/* ============================================ */}
      {/* TAB CONTENT */}
      {/* ============================================ */}
      <div className="p-6">{renderTabContent()}</div>
    </div>
  )
}
