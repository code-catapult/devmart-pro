import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { api } from '~/trpc/server'
import { UserListTable } from './components/UserListTable'
import { UserListCards } from './components/UserListCards'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { Pagination } from './components/Pagination'
import type { UserListFilters } from '@repo/shared/types'

/**
 * User List Page - Server Component
 *
 * This is the main admin page for viewing and managing users.
 * It's a Server Component, which means:
 * - Runs only on the server (never in the browser)
 * - Can directly call tRPC procedures without API routes
 * - Can check authentication before rendering anything
 * - Sends zero JavaScript to the client (faster page loads)
 *
 * URL Structure:
 * /admin/users?search=john&role=ADMIN&status=ACTIVE&sortBy=createdAt&sortOrder=desc&page=1
 *
 * All filter state is stored in URL parameters, making the page:
 * - Bookmarkable (users can save specific filtered views)
 * - Shareable (admins can send links to colleagues)
 * - SEO-friendly (search engines can crawl different filter combinations)
 * - Back/forward compatible (browser navigation works correctly)
 */

interface PageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    status?: string
    sortBy?: string
    sortOrder?: string
    page?: string
  }>
}

export default async function UserListPage({ searchParams }: PageProps) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams
  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  /**
   * Check if user is authenticated and has admin role.
   * This runs on the server before any rendering happens.
   *
   * If not authenticated or not admin, redirect to login/home.
   * This is more secure than client-side checks because:
   * - Runs before any data is fetched
   * - Prevents unauthorized API calls
   * - Doesn't expose admin UI even for a split second
   */
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/api/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/') // Redirect non-admins to home page
  }

  // ============================================
  // PARSE URL PARAMETERS INTO FILTERS
  // ============================================

  /**
   * Convert URL search params into a strongly-typed filter object.
   * We provide sensible defaults for all parameters.
   *
   * Example URL: /admin/users?search=john&role=ADMIN&page=2
   * Results in:
   * {
   *   search: "john",
   *   role: "ADMIN",
   *   status: "ALL",
   *   sortBy: "createdAt",
   *   sortOrder: "desc",
   *   page: 2,
   *   limit: 20
   * }
   */
  const filters: UserListFilters = {
    search: params.search || '',
    role: (params.role as 'ALL' | 'USER' | 'ADMIN') || 'ALL',
    status: (params.status as 'ALL' | 'ACTIVE' | 'SUSPENDED') || 'ALL',
    sortBy:
      (params.sortBy as 'name' | 'email' | 'createdAt' | 'totalSpent') ||
      'createdAt',
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
    page: parseInt(params.page || '1', 10),
    limit: 20, // Fixed limit for consistency
  }

  // ============================================
  // FETCH USER DATA
  // ============================================

  /**
   * Call the tRPC procedure directly from the server.
   * No need for API routes or fetch() calls!
   *
   * The caller.admin.userManagement.getUsers() call:
   * 1. Validates input with Zod schema
   * 2. Checks admin authorization middleware
   * 3. Queries database with filters
   * 4. Returns paginated results
   */
  const caller = await api()
  const data = await caller.admin.userManagement.getUsers({
    search: filters.search,
    role: filters.role,
    status: filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit: filters.limit,
  })

  // ============================================
  // RENDER UI
  // ============================================

  /**
   * We use a hybrid approach:
   * - Server Component renders the page shell
   * - Client Components handle interactive parts
   *
   * Benefits:
   * - Minimal JavaScript shipped to browser
   * - Instant page load with data pre-rendered
   * - Interactive elements hydrate quickly
   */
  return (
    <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* ============================================ */}
      {/* PAGE HEADER */}
      {/* ============================================ */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          User Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          View and manage all users in the system
        </p>
      </div>

      {/* ============================================ */}
      {/* SEARCH AND FILTERS */}
      {/* ============================================ */}

      {/**
       * Client Components for interactive search and filters.
       * These are "hydrated" in the browser to handle user input.
       *
       * We pass current filter values as props so they can:
       * - Show current state in form fields
       * - Update URL when user changes filters
       * - Trigger page navigation (which causes server re-render)
       */}
      <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex-1">
          <SearchBar initialValue={filters.search} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterBar
            roleFilter={filters.role}
            statusFilter={filters.status}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* RESULTS SUMMARY */}
      {/* ============================================ */}

      {/**
       * Show how many results match the current filters.
       * This helps users understand if their search/filter is working.
       *
       * Example: "Showing 20 of 156 users"
       */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {data.users.length} of {data.pagination.total} users
        {filters.search && (
          <span className="ml-1">
            matching &quot;<span className="font-medium">{filters.search}</span>
            &quot;
          </span>
        )}
      </div>

      {/* ============================================ */}
      {/* USER LIST - RESPONSIVE LAYOUT */}
      {/* ============================================ */}

      {/**
       * We render TWO versions of the user list:
       * 1. Card view for mobile (< 768px) - better for touch
       * 2. Table view for desktop (≥ 768px) - better for scanning data
       *
       * Tailwind's responsive prefixes handle the swap:
       * - "block md:hidden" = show on mobile, hide on desktop
       * - "hidden md:block" = hide on mobile, show on desktop
       *
       * This is more performant than JavaScript-based responsive logic
       * because CSS handles it natively.
       */}

      {data.users.length === 0 ? (
        // ============================================
        // EMPTY STATE
        // ============================================
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search ||
              filters.role !== 'ALL' ||
              filters.status !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'No users in the system yet'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="block md:hidden">
            <UserListCards users={data.users} />
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block">
            <UserListTable
              users={data.users}
              currentSort={{
                field: filters.sortBy,
                order: filters.sortOrder,
              }}
            />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* PAGINATION */}
      {/* ============================================ */}

      {/**
       * Only show pagination if there's more than one page.
       * Pagination component handles:
       * - Page number buttons
       * - Previous/Next buttons
       * - Jump to first/last page
       * - Disabled states for boundary conditions
       */}
      {data.pagination.totalPages > 1 && (
        <div className="mt-6 md:mt-8">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalResults={data.pagination.total}
          />
        </div>
      )}
    </div>
  )
}

/**
 * ============================================
 * METADATA FOR SEO
 * ============================================
 *
 * Next.js uses this for <title>, <meta> tags, etc.
 * Important for admin pages to have descriptive titles
 * for browser tabs and bookmarks.
 */
export const metadata = {
  title: 'User Management | Admin',
  description: 'View and manage all users in the system',
}
