'use client'

import { AdminNavContent } from './admin-nav-content'

/**
 * AdminSidebar Component (Desktop Only)
 *
 * Fixed-width sidebar visible on medium screens and above (≥768px).
 * Hidden on mobile devices (handled by AdminLayout).
 */

interface AdminSidebarProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  return (
    <aside className="hidden md:flex w-64 border-r flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>

      {/* Shared Navigation Content */}
      <AdminNavContent user={user} />
    </aside>
  )
}
