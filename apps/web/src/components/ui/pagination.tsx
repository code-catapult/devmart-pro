'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@repo/ui'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Route } from 'next'
import { useTransition } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage?: number // Optional: items per page (default 12)
  onPageChange?: (page: number) => void // Optional: callback for non-URL based pagination
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 12,
  onPageChange,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handlePageChange = (page: number) => {
    // If callback provided, use it instead of URL routing
    if (onPageChange) {
      onPageChange(page)
      return
    }

    // Default URL-based routing
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}` as Route, {
        scroll: false,
      })
    })
  }

  // Generate page numbers to show (with mobile consideration)
  const getPageNumbers = (isMobile: boolean = false) => {
    const pages: (number | string)[] = []
    const maxPages = isMobile ? 5 : 7

    if (totalPages <= maxPages) {
      // Show all pages if within limit
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near start
        pages.push(2)
        if (!isMobile) pages.push(3)
        pages.push('...')
      } else if (currentPage >= totalPages - 2) {
        // Near end
        pages.push('...')
        if (!isMobile) pages.push(totalPages - 2)
        pages.push(totalPages - 1)
      } else {
        // In middle
        pages.push('...')
        if (!isMobile) pages.push(currentPage - 1)
        pages.push(currentPage)
        if (!isMobile) pages.push(currentPage + 1)
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
      {/* Results text - more concise on mobile */}
      <p className="text-sm text-muted-foreground text-center sm:text-left">
        <span className="hidden sm:inline">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{' '}
          results
        </span>
        <span className="sm:hidden">
          {(currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
        </span>
      </p>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Previous button - icon only on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className="px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Desktop page numbers */}
        <div className="hidden sm:flex items-center gap-2">
          {getPageNumbers(false).map((page, index) => (
            <span key={index}>
              {page === '...' ? (
                <span className="px-2 text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  disabled={isPending}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              )}
            </span>
          ))}
        </div>

        {/* Mobile page numbers */}
        <div className="flex sm:hidden items-center gap-1">
          {getPageNumbers(true).map((page, index) => (
            <span key={index}>
              {page === '...' ? (
                <span className="px-1 text-muted-foreground text-xs">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  disabled={isPending}
                  className="min-w-[32px] h-8 text-xs px-2"
                >
                  {page}
                </Button>
              )}
            </span>
          ))}
        </div>

        {/* Next button - icon only on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  )
}
