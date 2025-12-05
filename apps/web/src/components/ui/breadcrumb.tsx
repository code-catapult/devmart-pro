'use client'

import Link from 'next/link'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Route } from 'next'
import { useState } from 'react'
import { Button } from '@repo/ui'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const [showAll, setShowAll] = useState(false)

  // For mobile: show first, ellipsis, and last 2 items if more than 3
  const shouldCollapse = items.length > 3

  const getMobileItems = () => {
    if (!shouldCollapse || showAll) return items

    return [
      items[0], // First item (Home)
      { label: '...', href: '#' }, // Ellipsis
      items[items.length - 1], // Last item (current page)
    ]
  }

  const mobileItems = getMobileItems()

  return (
    <nav aria-label="Breadcrumb" className="w-full overflow-x-auto">
      {/* Mobile Breadcrumb (< md) */}
      <ol className="md:hidden flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground py-2">
        {mobileItems.map((item, index) => (
          <li
            key={`${item.href}-${index}`}
            className="flex items-center shrink-0"
          >
            {index > 0 && (
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1" />
            )}

            {item.label === '...' ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 hover:bg-transparent"
                onClick={() => setShowAll(!showAll)}
                aria-label="Show all breadcrumb items"
              >
                <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : index === mobileItems.length - 1 ? (
              <span
                className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]"
                aria-current="page"
                title={item.label}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href as Route}
                className="hover:text-foreground transition-colors truncate max-w-[80px] sm:max-w-[120px]"
                title={item.label}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {/* Desktop Breadcrumb (>= md) */}
      <ol className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}

            {index === items.length - 1 ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href as Route}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
