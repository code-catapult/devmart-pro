import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { AdminSidebar } from '~/components/admin/admin-sidebar'
import { authOptions } from '~/lib/auth'

/**
 * Admin Layout
 *
 * Wraps all /admin routes with:
 * - Server-side authorization check (redirects non-admins)
 * - Shared sidebar navigation
 * - Admin-specific styling/branding
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get session on server
  const session = await getServerSession(authOptions)

  // Redirect if not logged in or an admin
  if (!session || !session.user || session.user.role !== 'ADMIN') {
    redirect('/') // All unauthorized users go to same place
  }

  // User is authenticated AND authorized
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <AdminSidebar user={session.user} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 md:px-8">{children}</div>
      </main>
    </div>
  )
}
