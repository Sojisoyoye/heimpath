/**
 * Running Costs Tab Component
 * Displays Nebenkosten summary with KPI cards, alert banner, and category breakdown
 */

import { AlertTriangle } from "lucide-react"

import { formatEur } from "@/common/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePortfolioCostSummary } from "@/hooks/queries/usePortfolioQueries"
import type { CostCategory } from "@/models/portfolio"
import { COST_CATEGORY_LABELS } from "@/models/portfolio"

interface IProps {
  propertyId: string
}

/******************************************************************************
                              Functions
******************************************************************************/

function getCategoryLabel(category: string): string {
  return COST_CATEGORY_LABELS[category as CostCategory] ?? category
}

function formatVariancePercent(percent: number): string {
  const sign = percent > 0 ? "+" : ""
  return `${sign}${percent}%`
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Running costs summary with KPIs and breakdown. */
function RunningCostsTab(props: Readonly<IProps>) {
  const { propertyId } = props
  const { data, isLoading } = usePortfolioCostSummary(propertyId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No running cost data yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add transactions with a cost category to start tracking Nebenkosten
          (ancillary costs).
        </p>
      </div>
    )
  }

  const varianceDisplay =
    data.totalVariance === null ? "-" : formatEur(data.totalVariance)

  let varianceColor = "text-muted-foreground"
  if (data.totalVariance !== null) {
    varianceColor =
      data.totalVariance > 0
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400"
  }

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {data.alertCategories.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Overcharge Alert</AlertTitle>
          <AlertDescription>
            The following categories exceed estimates by more than 20%:{" "}
            <strong>
              {data.alertCategories.map((c) => getCategoryLabel(c)).join(", ")}
            </strong>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monthly Nebenkosten (Ancillary Costs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatEur(data.totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance from Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${varianceColor}`}>
              {varianceDisplay}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Cost Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.highestCategory
                ? getCategoryLabel(data.highestCategory)
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => (
                <TableRow key={cat.category}>
                  <TableCell className="font-medium">
                    {getCategoryLabel(cat.category)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatEur(cat.actualTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.estimatedTotal === null
                      ? "-"
                      : formatEur(cat.estimatedTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.variancePercent === null
                      ? "-"
                      : formatVariancePercent(cat.variancePercent)}
                  </TableCell>
                  <TableCell>
                    {cat.isOverThreshold ? (
                      <Badge variant="destructive">Over</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RunningCostsTab }
export default RunningCostsTab
