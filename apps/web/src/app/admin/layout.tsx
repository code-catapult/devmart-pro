// import { redirect } from 'next/navigation'
// import { getServerSession } from 'next-auth'
// import { AdminSidebar } from '~/components/admin/admin-sidebar'
// import { authOptions } from '~/lib/auth'

// /**
//  * Admin Layout
//  *
//  * Wraps all /admin routes with:
//  * - Server-side authorization check (redirects non-admins)
//  * - Shared sidebar navigation
//  * - Admin-specific styling/branding
//  */
// export default async function AdminLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   // Get session on server
//   const session = await getServerSession(authOptions)

//   // Redirect if not logged in or an admin
//   if (!session || !session.user || session.user.role !== 'ADMIN') {
//     redirect('/') // All unauthorized users go to same place
//   }

//   // User is authenticated AND authorized
//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar Navigation */}
//       <AdminSidebar user={session.user} />

//       {/* Main Content Area */}
//       <main className="flex-1 overflow-y-auto">
//         <div className="container mx-auto px-4 py-8 md:px-8">{children}</div>
//       </main>
//     </div>
//   )
// }

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { AdminSidebar } from '~/components/admin/admin-sidebar'
import { AdminMobileHeader } from '~/components/admin/admin-mobile-header'
import { authOptions } from '~/lib/auth'

/**
 * Admin Layout (Mobile-Responsive)
 *
 * Wraps all /admin routes with:
 * - Server-side authorization check (redirects non-admins)
 * - Responsive navigation (sidebar on desktop, drawer on mobile)
 * - Admin-specific styling/branding
 *
 * Responsive Behavior:
 * - Mobile (<768px): Mobile header with hamburger menu, full-width content
 * - Desktop (≥768px): Fixed sidebar, content beside sidebar
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get session on server
  const session = await getServerSession(authOptions)

  // Redirect if not logged in or admin
  if (!session || !session.user || session.user.role !== 'ADMIN') {
    redirect('/') // All unauthorized users go to same place
  }

  // User is authenticated AND authorized
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Desktop Sidebar (hidden on mobile) */}
      <AdminSidebar user={session.user} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header (hidden on desktop) */}
        <AdminMobileHeader user={session.user} />

        {/* Page Content */}
        <div className="container mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
