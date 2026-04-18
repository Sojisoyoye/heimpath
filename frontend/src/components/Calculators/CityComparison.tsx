/**
 * City Comparison Component
 * Allows users to select 2–4 cities/areas and compare metrics side by side
 */

import {
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Search,
  TrendingUp,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAreas, useCityComparison } from "@/hooks/queries/useMarketQueries"
import type { AreaSummary, ComparisonMetrics } from "@/models/marketComparison"

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_SELECTIONS = 4
const MIN_SELECTIONS = 2

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const RENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Grouped dropdown for selecting areas */
function AreaSelector(props: {
  areas: AreaSummary[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  const { areas, selected, onToggle } = props
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

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
    <div className="relative">
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
                    !isSelected && selected.length >= MAX_SELECTIONS
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

/** Trend badge */
function TrendBadge(props: { trend: string | null }) {
  if (!props.trend) return null
  const isRising = props.trend === "rising"
  return (
    <Badge variant={isRising ? "default" : "secondary"}>
      {isRising && <TrendingUp className="h-3 w-3" />}
      {props.trend}
    </Badge>
  )
}

/** Comparison table */
function ComparisonTable(props: { data: ComparisonMetrics[] }) {
  const { data } = props

  const bestPrice = Math.min(...data.map((d) => d.avgPricePerSqm))
  const bestYield = Math.max(
    ...data
      .filter((d) => d.grossRentalYield != null)
      .map((d) => d.grossRentalYield!),
  )
  const bestTax = Math.min(...data.map((d) => d.transferTaxRate))

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium">Metric</th>
                {data.map((d) => (
                  <th key={d.key} className="pb-3 font-medium text-right">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price per sqm */}
              <tr className="border-b">
                <td className="py-3 font-medium">Avg. Price/m²</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      d.avgPricePerSqm === bestPrice &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {CURRENCY_FORMATTER.format(d.avgPricePerSqm)}
                  </td>
                ))}
              </tr>

              {/* Price range */}
              <tr className="border-b">
                <td className="py-3 font-medium">Price Range</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className="py-3 text-right text-muted-foreground"
                  >
                    {CURRENCY_FORMATTER.format(d.priceRangeMin)} –{" "}
                    {CURRENCY_FORMATTER.format(d.priceRangeMax)}
                  </td>
                ))}
              </tr>

              {/* Rent per sqm */}
              <tr className="border-b">
                <td className="py-3 font-medium">Avg. Rent/m²</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    {d.avgRentPerSqm != null ? (
                      RENT_FORMATTER.format(d.avgRentPerSqm)
                    ) : (
                      <Badge variant="outline">No data</Badge>
                    )}
                  </td>
                ))}
              </tr>

              {/* Rent range */}
              <tr className="border-b">
                <td className="py-3 font-medium">Rent Range</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className="py-3 text-right text-muted-foreground"
                  >
                    {d.rentRangeMin != null && d.rentRangeMax != null ? (
                      <>
                        {RENT_FORMATTER.format(d.rentRangeMin)} –{" "}
                        {RENT_FORMATTER.format(d.rentRangeMax)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>

              {/* Gross yield */}
              <tr className="border-b">
                <td className="py-3 font-medium">Gross Yield</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      d.grossRentalYield != null &&
                        d.grossRentalYield === bestYield &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {d.grossRentalYield != null ? (
                      `${d.grossRentalYield}%`
                    ) : (
                      <Badge variant="outline">No data</Badge>
                    )}
                  </td>
                ))}
              </tr>

              {/* Transfer tax */}
              <tr className="border-b">
                <td className="py-3 font-medium">Transfer Tax</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      d.transferTaxRate === bestTax &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {d.transferTaxRate}%
                  </td>
                ))}
              </tr>

              {/* Agent fee */}
              <tr className="border-b">
                <td className="py-3 font-medium">Agent Fee</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    {d.agentFeePercent != null ? `${d.agentFeePercent}%` : "—"}
                  </td>
                ))}
              </tr>

              {/* Trend */}
              <tr>
                <td className="py-3 font-medium">Trend</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    <TrendBadge trend={d.trend} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/** Default component. City comparison tool. */
function CityComparison(props: IProps) {
  const { className } = props
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const { data: areas, isLoading: areasLoading } = useAreas()
  const { data: comparison, isLoading: comparisonLoading } =
    useCityComparison(selectedKeys)

  function handleToggle(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length < MAX_SELECTIONS
          ? [...prev, key]
          : prev,
    )
  }

  function handleRemove(key: string) {
    setSelectedKeys((prev) => prev.filter((k) => k !== key))
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Compare Cities
          </CardTitle>
          <CardDescription>
            Select 2–4 cities or states to compare market data side by side
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {areasLoading ? (
            <p className="text-sm text-muted-foreground">Loading areas...</p>
          ) : (
            areas && (
              <AreaSelector
                areas={areas}
                selected={selectedKeys}
                onToggle={handleToggle}
              />
            )
          )}

          {/* Selected chips */}
          {selectedKeys.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedKeys.map((key) => {
                const area = areas?.find((a) => a.key === key)
                return (
                  <Badge key={key} variant="secondary" className="gap-1 pr-1">
                    {area?.name ?? key}
                    <button
                      type="button"
                      onClick={() => handleRemove(key)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}

          {selectedKeys.length > 0 && selectedKeys.length < MIN_SELECTIONS && (
            <p className="text-sm text-muted-foreground">
              Select at least {MIN_SELECTIONS} areas to compare.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comparison table */}
      {comparison && comparison.length >= MIN_SELECTIONS && (
        <ComparisonTable data={comparison} />
      )}

      {selectedKeys.length >= MIN_SELECTIONS && comparisonLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading comparison...</p>
          </CardContent>
        </Card>
      )}

      {selectedKeys.length < MIN_SELECTIONS && !areasLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select cities above to compare market data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CityComparison }
