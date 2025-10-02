'use client'

import { RequireAdmin } from '@/components/auth/protected-route'

function AdminDashboardPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">
          Admin authentication successful! The full admin dashboard with user
          management, analytics, and system controls will be implemented in Epic
          3 (Admin Management & Analytics).
        </p>
        <div className="pt-4 text-sm text-gray-500">
          <p>✅ Admin authentication working</p>
          <p>✅ Role-based access working</p>
          <p>⏳ Full admin dashboard coming in Epic 3</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <AdminDashboardPlaceholder />
    </RequireAdmin>
  )
}
