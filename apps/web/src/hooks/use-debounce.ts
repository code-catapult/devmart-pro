import { useEffect, useState } from 'react'

/**
 * useDebounce Hook
 *
 * Debounces a value, delaying updates until user stops typing.
 * Prevents excessive API calls during rapid input changes.
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
