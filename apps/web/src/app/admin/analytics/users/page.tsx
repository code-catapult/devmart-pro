import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { UserAnalytics } from './components/UserAnalytics'

/**
 * Admin User Analytics Page
 *
 * Server Component that enforces admin-only access
 * and renders the client-side analytics dashboard.
 *
 * This page uses a relative import for the UserAnalytics component
 * since it's co-located in the same route directory.
 */
export default async function UserAnalyticsPage() {
  const session = await getServerSession(authOptions)

  // Enforce admin access
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div>
      <UserAnalytics />
    </div>
  )
}
