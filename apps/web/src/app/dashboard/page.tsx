'use client'

import { RequireAuth } from '@/components/auth/protected-route'

function DashboardPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          You've successfully logged in! The full dashboard with user stats,
          quick actions, and order history will be implemented in Story 1.4.
        </p>
        <div className="pt-4 text-sm text-gray-500">
          <p>✅ Authentication working</p>
          <p>✅ Protected route working</p>
          <p>⏳ Full dashboard coming in Story 1.4</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardPlaceholder />
    </RequireAuth>
  )
}
