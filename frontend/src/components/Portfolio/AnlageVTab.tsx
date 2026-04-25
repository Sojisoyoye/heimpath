/**
 * Anlage V Tax Summary Tab Component
 * Annual rental income tax summary for § 21 EStG (Anlage V)
 */

import { Info } from "lucide-react"
import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import Colors from "@/common/styles/Colors"
import { formatEur } from "@/common/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { usePortfolioTaxSummary } from "@/hooks/queries/usePortfolioQueries"

interface IProps {
  propertyId: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_YEAR = CURRENT_YEAR - 1
const AVAILABLE_YEARS = Array.from(
  { length: 5 },
  (_, i) => CURRENT_YEAR - 1 - i,
)

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

function formatEurShort(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `€${Math.round(v / 1000)}k`
  }
  return EUR_FORMATTER.format(v)
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Anlage V rental income tax summary for a given year. */
function AnlageVTab(props: Readonly<IProps>) {
  const { propertyId } = props
  const [year, setYear] = useState(DEFAULT_YEAR)
  const { data, isLoading } = usePortfolioTaxSummary(propertyId, year)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No tax summary available
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add rental income and expense transactions to generate your Anlage V
          summary.
        </p>
      </div>
    )
  }

  const isRentalLoss = data.netTaxableIncome < 0
  const netColor = isRentalLoss
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-foreground"

  const chartData = [
    { name: "Gross Rent", amount: data.grossRentIncome },
    { name: "Total Werbungskosten", amount: data.totalWerbungskosten },
  ]

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Tax year:
        </span>
        {AVAILABLE_YEARS.map((y) => (
          <Button
            key={y}
            variant={y === year ? "default" : "outline"}
            size="sm"
            onClick={() => setYear(y)}
          >
            {y}
          </Button>
        ))}
      </div>

      {/* Info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This summary helps you prepare <strong>Anlage V (§ 21 EStG)</strong>{" "}
          for your German tax return. AfA is calculated at{" "}
          <strong>{data.afaRatePercent}%</strong> on building value{" "}
          <strong>{formatEur(data.buildingValue)}</strong> (land share:{" "}
          {data.landSharePercent}%). Consult a Steuerberater for your final
          filing.
        </AlertDescription>
      </Alert>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Rent Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatEur(data.grossRentIncome)}
            </p>
            <p className="text-xs text-muted-foreground">Zeile 9 — Anlage V</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Werbungskosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{formatEur(data.totalWerbungskosten)}
            </p>
            <p className="text-xs text-muted-foreground">
              incl. AfA {formatEur(data.afaDeduction)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Taxable Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netColor}`}>
              {formatEur(data.netTaxableIncome)}
            </p>
            {isRentalLoss && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Rental loss — reduces other income
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income vs Werbungskosten chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs. Werbungskosten {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatEurShort} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  formatEur(Number(value)),
                  String(name),
                ]}
              />
              <Bar
                dataKey="amount"
                fill={Colors.Chart.Blue}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anlage V line-item table */}
      <Card>
        <CardHeader>
          <CardTitle>Anlage V Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeile</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lineItems.map((item) => (
                <TableRow key={item.anlageVZeile ?? item.label}>
                  <TableCell className="text-muted-foreground">
                    {item.anlageVZeile ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right">
                    {formatEur(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell />
                <TableCell>Net Taxable Income (§ 21 EStG)</TableCell>
                <TableCell className={`text-right ${netColor}`}>
                  {formatEur(data.netTaxableIncome)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This is an estimate only. AfA is based on purchase price and building
        year — consult a licensed Steuerberater (tax advisor) before filing.
      </p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AnlageVTab }
export default AnlageVTab
