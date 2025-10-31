import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebounce } from '~/hooks/use-debounce'
import { Button, Input } from '@repo/ui'

export function ProductSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const currentSearch = params.get('search') || ''

    // Only update if the search term actually changed
    if (debouncedSearch !== currentSearch) {
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      } else {
        params.delete('search')
      }

      // Reset to page 1 when searching
      params.set('page', '1')

      router.push(`/products?${params.toString()}`)
    }
  }, [debouncedSearch, router, searchParams])

  const handleClear = () => {
    setSearchTerm('')
  }

  return (
    <div className="relative w-full">
      <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value)
        }
        className="pl-8 pr-10 sm:pl-10 w-full"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
