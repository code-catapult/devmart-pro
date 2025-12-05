import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { SecurityMonitoring } from '~/components/admin/security-monitoring'
import { authOptions } from '~/lib/auth'

/**
 * Admin Security Monitoring Page
 *
 * Server Component that enforces admin-only access
 * and renders the security monitoring dashboard.
 */
export default async function SecurityMonitoringPage() {
  const session = await getServerSession(authOptions)

  // Enforce admin access
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <SecurityMonitoring />
    </div>
  )
}
