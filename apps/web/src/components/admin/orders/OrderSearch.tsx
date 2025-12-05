'use client'

import { useState, useEffect } from 'react'
import { Button, Input } from '@repo/ui'
import { Search, X } from 'lucide-react'
import { useDebounce } from '~/hooks/use-debounce'

interface OrderSearchProps {
  initialValue?: string
  onSearchChange: (search: string) => void
  debounceMs?: number
}

/**
 * OrderSearch Component
 *
 * Debounced search input for orders. We'll be using the useDebounce() hook we already created on our hooks directory.
 * Waits for user to stop typing before triggering search.
 */
export function OrderSearch({
  initialValue = '',
  onSearchChange,
  debounceMs = 300,
}: OrderSearchProps) {
  // Local input value (updates immediately on keystroke)
  const [searchTerm, setSearchTerm] = useState(initialValue)

  // Debounce the search term
  const debouncedSearch = useDebounce(searchTerm, debounceMs)

  // Update search when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleClear = () => {
    setSearchTerm('')
  }

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search Icon */}
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search by order #, customer name, or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 pr-10"
      />

      {/* Clear Button (only show if input has value) */}
      {searchTerm && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}
