/**
 * Hook for debounced search query with optional URL sync
 */

import { useEffect, useState } from "react"

/** Manages debounced search query state with optional URL sync via onQueryChange. */
function useSearchQuery(
  initialQuery?: string,
  onQueryChange?: (q: string) => void,
) {
  const [query, setQuery] = useState(initialQuery ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery ?? "")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      onQueryChange?.(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, onQueryChange])

  const handleClear = () => {
    setQuery("")
    setDebouncedQuery("")
    onQueryChange?.("")
  }

  return { query, setQuery, debouncedQuery, handleClear }
}

export { useSearchQuery }
