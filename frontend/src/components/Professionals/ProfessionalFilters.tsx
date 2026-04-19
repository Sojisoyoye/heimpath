/**
 * Professional Filters Component
 * Filter controls for the professional directory
 */

import { Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProfessionalFilterOptions } from "@/hooks/queries"
import type {
  ProfessionalFilter,
  ProfessionalType,
} from "@/models/professional"
import { PROFESSIONAL_TYPE_LABELS } from "@/models/professional"

interface IProps {
  filters: ProfessionalFilter
  onFiltersChange: (filters: ProfessionalFilter) => void
}

/******************************************************************************
                              Constants
******************************************************************************/

const PROFESSIONAL_TYPES: ProfessionalType[] = [
  "lawyer",
  "notary",
  "tax_advisor",
  "mortgage_broker",
  "real_estate_agent",
]

const MIN_RATINGS = [
  { value: "3", label: "3+ stars" },
  { value: "4", label: "4+ stars" },
  { value: "4.5", label: "4.5+ stars" },
]

const SORT_OPTIONS = [
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "recommended", label: "Most recommended" },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Filter controls for professional directory. */
function ProfessionalFilters(props: Readonly<IProps>) {
  const { filters, onFiltersChange } = props
  const { data: filterOptions } = useProfessionalFilterOptions()

  const cities = filterOptions?.cities ?? []
  const languages = filterOptions?.languages ?? []

  const activeFilterCount = [
    filters.type,
    filters.city,
    filters.language,
    filters.minRating,
    filters.sortBy,
  ].filter(Boolean).length

  function handleClearFilters() {
    onFiltersChange({ page: 1, pageSize: filters.pageSize })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {/* Type filter */}
        <Select
          value={filters.type ?? "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              type: v === "all" ? undefined : (v as ProfessionalType),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PROFESSIONAL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PROFESSIONAL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City filter */}
        <Select
          value={filters.city ?? "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              city: v === "all" ? undefined : v,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language filter */}
        <Select
          value={filters.language ?? "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              language: v === "all" ? undefined : v,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Min rating filter */}
        <Select
          value={filters.minRating?.toString() ?? "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              minRating: v === "all" ? undefined : Number(v),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Any rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any rating</SelectItem>
            {MIN_RATINGS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort by */}
        <Select
          value={filters.sortBy ?? "rating"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              sortBy: v === "rating" ? undefined : v,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfessionalFilters }
