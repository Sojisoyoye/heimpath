/**
 * Area Selector Component
 * Searchable multi-select dropdown grouped by state for city comparison
 */

import { Building2, Check, ChevronDown, MapPin, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AreaSummary } from "@/models/marketComparison"

interface IProps {
  areas: AreaSummary[]
  selected: string[]
  maxSelections: number
  onToggle: (key: string) => void
}

/******************************************************************************
                              Components
******************************************************************************/

function AreaSelector(props: IProps) {
  const { areas, selected, maxSelections, onToggle } = props
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const grouped = useMemo(() => {
    const map = new Map<string, AreaSummary[]>()
    for (const area of areas) {
      const label = area.stateName
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(area)
    }
    return map
  }, [areas])

  const filtered = useMemo(() => {
    if (!search) return grouped
    const q = search.toLowerCase()
    const result = new Map<string, AreaSummary[]>()
    for (const [state, items] of grouped) {
      const matches = items.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.stateName.toLowerCase().includes(q) ||
          a.stateCode.toLowerCase().includes(q),
      )
      if (matches.length > 0) result.set(state, matches)
    }
    return result
  }, [grouped, search])

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        <span className="text-muted-foreground">
          {selected.length === 0
            ? "Select 2–4 cities to compare..."
            : `${selected.length} selected`}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cities or states..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {[...filtered.entries()].map(([state, items]) => (
              <div key={state}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {state}
                </div>
                {items.map((area) => {
                  const isSelected = selected.includes(area.key)
                  const isDisabled =
                    !isSelected && selected.length >= maxSelections
                  return (
                    <button
                      key={area.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onToggle(area.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isDisabled && "opacity-50 cursor-not-allowed",
                        isSelected && "bg-accent",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected &&
                            "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex items-center gap-1.5">
                        {area.areaType === "state" ? (
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        )}
                        {area.name}
                      </span>
                      {area.areaType === "state" && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          State
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            {filtered.size === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No areas found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AreaSelector }
