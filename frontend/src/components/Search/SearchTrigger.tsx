/**
 * Search Trigger
 * Header button that opens the global search dialog (Cmd+K)
 */

import { Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import GlobalSearchDialog from "./GlobalSearchDialog"

/******************************************************************************
                              Constants
******************************************************************************/

const IS_MAC =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")

/******************************************************************************
                              Components
******************************************************************************/

function SearchTrigger() {
  const [open, setOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden gap-2 text-muted-foreground sm:flex"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          {IS_MAC ? "\u2318K" : "Ctrl+K"}
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="sm:hidden"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default SearchTrigger
