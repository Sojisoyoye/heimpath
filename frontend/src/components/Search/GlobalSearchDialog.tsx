/**
 * Global Search Dialog
 * Command palette (Cmd+K) for searching laws and articles
 */

import { useNavigate } from "@tanstack/react-router"
import { FileText, Loader2, Scale, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useGlobalSearch } from "@/hooks/queries/useSearchQueries"
import type { SearchResultItem } from "@/models/search"

/******************************************************************************
                              Constants
******************************************************************************/

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ResultIcon({ resultType }: { resultType: string }) {
  if (resultType === "law") {
    return <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
}

function ResultItem({
  item,
  onSelect,
}: {
  item: SearchResultItem
  onSelect: (item: SearchResultItem) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
    >
      <ResultIcon resultType={item.resultType} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.title}</p>
        <p className="truncate text-muted-foreground">{item.snippet}</p>
      </div>
    </button>
  )
}

function ResultGroup({
  label,
  items,
  onSelect,
}: {
  label: string
  items: SearchResultItem[]
  onSelect: (item: SearchResultItem) => void
}) {
  if (items.length === 0) return null

  return (
    <div>
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {items.map((item) => (
        <ResultItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}

function GlobalSearchDialog({ open, onOpenChange }: IProps) {
  const [inputValue, setInputValue] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data, isLoading } = useGlobalSearch(debouncedQuery)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim())
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Focus input on open, clear on close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setInputValue("")
      setDebouncedQuery("")
    }
  }, [open])

  function handleSelect(item: SearchResultItem) {
    onOpenChange(false)
    navigate({ to: item.urlPath })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const trimmed = inputValue.trim()
    if (e.key === "Enter" && trimmed.length >= MIN_QUERY_LENGTH) {
      onOpenChange(false)
      navigate({ to: "/search", search: { q: trimmed } })
    }
  }

  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH
  const hasResults = data && data.totalCount > 0
  const showEmpty = hasQuery && !isLoading && !hasResults

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search laws and articles..."
            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!hasQuery && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </p>
          )}

          {showEmpty && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found for &quot;{debouncedQuery}&quot;
            </p>
          )}

          {hasResults && (
            <div className="space-y-2">
              <ResultGroup
                label="Laws"
                items={data.laws}
                onSelect={handleSelect}
              />
              <ResultGroup
                label="Articles"
                items={data.articles}
                onSelect={handleSelect}
              />
            </div>
          )}

          {hasQuery && hasResults && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                navigate({ to: "/search", search: { q: debouncedQuery } })
              }}
              className="mt-2 w-full rounded-md px-3 py-2 text-center text-sm text-muted-foreground hover:bg-accent"
            >
              View all results
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default GlobalSearchDialog
