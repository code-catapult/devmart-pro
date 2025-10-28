import { api } from '~/trpc/server'
import { CategoryTreeClient } from '~/components/admin/category-tree-client'

/**
 * Admin Categories Page
 *
 * Displays hierarchical category tree with CRUD operations.
 * Server component that fetches category tree on server.
 *
 * Features:
 * - Server-side data fetching (no loading state)
 * - Hierarchical tree view
 * - Inline editing
 * - Add child categories
 * - Delete with validation
 */

export default async function CategoriesPage() {
  // Fetch category tree on server (SSR)
  const caller = await api()
  const categories = await caller.admin.categories.getTree()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-700 md:text-3xl font-bold tracking-tight">
            Category Management
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            Organize products into hierarchical categories
          </p>
        </div>
      </div>

      <CategoryTreeClient initialCategories={categories} />
    </div>
  )
}
