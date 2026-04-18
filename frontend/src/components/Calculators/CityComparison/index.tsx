/**
 * City Comparison Component
 * Allows users to select 2–4 cities/areas and compare metrics side by side
 */

import { Building2, X } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAreas, useCityComparison } from "@/hooks/queries/useMarketQueries"

import { AreaSelector } from "./AreaSelector"
import { ComparisonTable } from "./ComparisonTable"

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_SELECTIONS = 4
const MIN_SELECTIONS = 2

/******************************************************************************
                              Components
******************************************************************************/

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
                maxSelections={MAX_SELECTIONS}
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
