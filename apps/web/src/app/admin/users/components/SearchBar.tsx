'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '~/hooks/use-debounce'

/**
 * SearchBar Component
 *
 * Provides a search input that filters users by name or email.
 *
 * KEY FEATURES:
 * - Debouncing: Waits 300ms after user stops typing before searching
 * - URL persistence: Search term is stored in URL query params
 * - Clear button: Quick way to reset search
 * - Loading state: Shows visual feedback while search is pending
 * - Mobile-optimized: Large touch target, appropriate keyboard type
 *
 * DEBOUNCING EXPLANATION:
 * Without debouncing, every keystroke triggers a server request:
 *   User types "john" → 4 requests: "j", "jo", "joh", "john"
 *
 * With debouncing, we wait for user to pause:
 *   User types "john" → pause 300ms → 1 request: "john"
 *
 * This reduces server load by 70-90% and prevents UI flicker.
 */

interface SearchBarProps {
  initialValue: string // Current search value from URL
}

export function SearchBar({ initialValue }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ============================================
  // LOCAL STATE
  // ============================================

  /**
   * We maintain local state for the input value to provide
   * instant feedback as the user types. The URL is only updated
   * after debouncing, but the input shows changes immediately.
   */
  const [searchValue, setSearchValue] = useState(initialValue)
  const [isSearching, setIsSearching] = useState(false)

  // ============================================
  // DEBOUNCED SEARCH VALUE
  // ============================================

  /**
   * Debounce the search value to prevent excessive server requests.
   * The debounced value updates 300ms after the user stops typing.
   */
  const debouncedSearchValue = useDebounce(searchValue, 300)

  // ============================================
  // SYNC WITH URL CHANGES
  // ============================================

  /**
   * Reset isSearching when the page re-renders with new data.
   * This happens when the URL changes and the parent page fetches new data.
   */
  useEffect(() => {
    setIsSearching(false)
    setSearchValue(initialValue)
  }, [initialValue])

  // ============================================
  // DEBOUNCED SEARCH FUNCTION
  // ============================================

  /**
   * This function updates the URL after a 300ms delay.
   *
   * How it works:
   * 1. User types "j" → timeout is set
   * 2. User types "o" → previous timeout is cleared, new timeout set
   * 3. User types "h" → previous timeout is cleared, new timeout set
   * 4. User types "n" → previous timeout is cleared, new timeout set
   * 5. User pauses for 300ms → timeout fires, URL is updated
   *
   * useCallback ensures this function is only recreated if dependencies change.
   */
  const performSearch = useCallback(
    (value: string) => {
      setIsSearching(true)

      // Build new URL with updated search param
      const params = new URLSearchParams(searchParams.toString())

      if (value.trim()) {
        params.set('search', value.trim())
      } else {
        params.delete('search') // Remove param if search is empty
      }

      // Reset to page 1 when search changes
      // (otherwise user might be on page 5 with no results)
      params.set('page', '1')

      // Navigate to new URL (triggers server re-render)
      router.push(`/admin/users?${params.toString()}`)

      // Note: isSearching will be reset when component re-renders with new data
    },
    [router, searchParams]
  )

  // ============================================
  // PERFORM SEARCH ON DEBOUNCED VALUE CHANGE
  // ============================================

  /**
   * Trigger search when debounced value changes and differs from URL.
   * This runs after the user has stopped typing for 300ms.
   */
  useEffect(() => {
    if (debouncedSearchValue !== initialValue) {
      performSearch(debouncedSearchValue)
    }
  }, [debouncedSearchValue, initialValue, performSearch])

  // ============================================
  // CLEAR SEARCH HANDLER
  // ============================================

  /**
   * Clear button click handler.
   * Clears the input value - the debounced search effect will handle
   * the URL update automatically (empty strings debounce immediately).
   */
  const handleClear = () => {
    setSearchValue('')
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative">
      {/* ============================================ */}
      {/* SEARCH ICON (LEFT) */}
      {/* ============================================ */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-5 w-5 text-gray-400" />
      </div>

      {/* ============================================ */}
      {/* SEARCH INPUT */}
      {/* ============================================ */}
      <input
        type="text"
        inputMode="search" // Mobile keyboards show search button instead of return
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search by name or email..."
        className="
          block w-full rounded-lg border border-gray-300 bg-white
          py-2.5 pl-10 pr-10
          text-sm text-gray-900 placeholder-gray-500
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
          disabled:cursor-not-allowed disabled:bg-gray-50
          md:py-2 md:text-base
        "
        disabled={isSearching} // Prevent typing while search is in progress
      />

      {/* ============================================ */}
      {/* CLEAR BUTTON (RIGHT) */}
      {/* ============================================ */}
      {searchValue && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute inset-y-0 right-0 flex items-center pr-3
            text-gray-400 hover:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg
            min-h-[44px] min-w-[44px]
          "
          aria-label="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* ============================================ */}
      {/* LOADING INDICATOR */}
      {/* ============================================ */}
      {isSearching && (
        <div className="absolute inset-y-0 right-10 flex items-center pr-3">
          <svg
            className="h-5 w-5 animate-spin text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  )
}
