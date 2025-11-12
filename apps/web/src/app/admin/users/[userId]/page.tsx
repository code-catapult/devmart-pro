import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { api } from '~/trpc/server'
import Link from 'next/link'
import { UserProfileHeader } from './components/UserProfileHeader'
import { ProfileTabs } from './components/ProfileTabs'

/**
 * User Profile Page - Server Component
 *
 * This page displays comprehensive information about a single user.
 * It's a Server Component that fetches all data on the server before rendering.
 *
 * ROUTE: /admin/users/[userId]
 * Example: /admin/users/clxyz123abc
 *
 * The [userId] dynamic segment is automatically extracted by Next.js
 * and passed to the component as params.userId.
 */

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/api/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  // ============================================
  // FETCH USER PROFILE DATA
  // ============================================

  /**
   * Call tRPC procedure to fetch aggregated profile data.
   * This includes user info, stats, orders, activity, and notes.
   *
   * If user doesn't exist, the procedure throws a NOT_FOUND error,
   * which triggers the notFound() function below.
   */
  const { userId } = await params
  let profileData

  try {
    const caller = await api()
    profileData = await caller.admin.userManagement.getUserById({
      id: userId,
    })
  } catch {
    // If user not found, show 404 page
    notFound()
  }

  // ============================================
  // RENDER UI
  // ============================================

  return (
    <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* ============================================ */}
      {/* BACK BUTTON */}
      {/* ============================================ */}
      <div className="mb-4">
        <Link
          href="/admin/users"
          className="
            inline-flex items-center gap-2
            text-sm text-gray-600
            hover:text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded
          "
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Users
        </Link>
      </div>

      {/* ============================================ */}
      {/* USER PROFILE HEADER */}
      {/* ============================================ */}
      {/*
        Header shows user overview, stats, and action buttons.
        This is a Client Component for interactive elements (buttons).
      */}
      <UserProfileHeader user={profileData.user} stats={profileData.stats} />

      {/* ============================================ */}
      {/* TABBED CONTENT */}
      {/* ============================================ */}
      {/*
        Tabs organize different data views:
        - Overview: Summary stats and highlights
        - Orders: Order history with filters
        - Activity: Activity log timeline
        - Notes: Support notes with inline creation

        This is a Client Component to handle tab switching.
      */}
      <div className="mt-6">
        <ProfileTabs
          userId={userId}
          initialData={{
            orders: profileData.recentOrders,
            activity: profileData.recentActivity,
            notes: profileData.supportNotes,
          }}
        />
      </div>
    </div>
  )
}

/**
 * ============================================
 * METADATA FOR SEO
 * ============================================
 *
 * Dynamic metadata based on user data.
 * This function runs on the server and can fetch data.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  try {
    const { userId } = await params
    const caller = await api()
    const profileData = await caller.admin.userManagement.getUserById({
      id: userId,
    })

    return {
      title: `${
        profileData.user.name || profileData.user.email
      } | User Profile`,
      description: `Admin view for user ${profileData.user.email}`,
    }
  } catch {
    return {
      title: 'User Not Found',
      description: 'The requested user could not be found',
    }
  }
}
