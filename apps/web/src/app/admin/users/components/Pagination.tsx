'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

/**
 * Pagination Component
 *
 * Provides page navigation controls for paginated user list.
 *
 * FEATURES:
 * - Previous/Next buttons
 * - Jump to first/last page
 * - Page number buttons (shows 5 at a time)
 * - Disabled states for boundary conditions
 * - Touch-friendly button sizes
 * - Results summary
 *
 * PAGINATION MATH:
 * - currentPage: 1-indexed (page 1, page 2, etc.)
 * - startResult: (currentPage - 1) * limit + 1
 * - endResult: min(currentPage * limit, totalResults)
 *
 * Example: Page 2 of 156 results (20 per page)
 * - startResult: (2 - 1) * 20 + 1 = 21
 * - endResult: min(2 * 20, 156) = 40
 * - Display: "Showing 21-40 of 156"
 */

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalResults: number
}

export function Pagination({
  currentPage,
  totalPages,
  totalResults,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())

    router.push(`/admin/users?${params.toString()}`)
  }

  const getPageNumbers = (): number[] => {
    const maxPagesToShow = 5
    const pages: number[] = []

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()
  const resultsPerPage = 20
  const startResult = (currentPage - 1) * resultsPerPage + 1
  const endResult = Math.min(currentPage * resultsPerPage, totalResults)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startResult}</span> to{' '}
        <span className="font-medium">{endResult}</span> of{' '}
        <span className="font-medium">{totalResults}</span> results
      </div>

      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="
            flex items-center justify-center
            rounded-lg border border-gray-300 bg-white
            p-2 text-gray-700
            hover:bg-gray-50
            disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            min-h-[44px] min-w-[44px]
          "
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="
            flex items-center justify-center
            rounded-lg border border-gray-300 bg-white
            p-2 text-gray-700
            hover:bg-gray-50
            disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            min-h-[44px] min-w-[44px]
          "
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex sm:items-center sm:gap-1">
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => goToPage(pageNum)}
              className={`
                flex items-center justify-center
                rounded-lg border px-4 py-2
                text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                min-h-[44px] min-w-[44px]
                ${
                  pageNum === currentPage
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
              aria-label={`Go to page ${pageNum}`}
              aria-current={pageNum === currentPage ? 'page' : undefined}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <div className="flex sm:hidden items-center justify-center px-4 py-2 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </div>

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="
            flex items-center justify-center
            rounded-lg border border-gray-300 bg-white
            p-2 text-gray-700
            hover:bg-gray-50
            disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            min-h-[44px] min-w-[44px]
          "
          aria-label="Go to next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="
            flex items-center justify-center
            rounded-lg border border-gray-300 bg-white
            p-2 text-gray-700
            hover:bg-gray-50
            disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            min-h-[44px] min-w-[44px]
          "
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
