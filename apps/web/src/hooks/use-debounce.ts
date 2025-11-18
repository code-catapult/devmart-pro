import { useEffect, useState } from 'react'

/**
 * useDebounce Hook
 *
 * Debounces a value, delaying updates until user stops typing.
 * Prevents excessive API calls during rapid input changes.
 *
 * SPECIAL HANDLING:
 * - Empty strings are updated immediately (no debounce) for instant clear actions
 * - Non-empty values are debounced by the specified delay
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * // API called only after 300ms of no typing
 * const { data } = useQuery({ search: debouncedSearch });
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Immediate update for empty strings (clear actions)
    // This prevents stale debounced values when user clicks "Clear"
    if (typeof value === 'string' && value === '') {
      setDebouncedValue(value)
      return
    }

    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up timer if value changes before delay completes
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
