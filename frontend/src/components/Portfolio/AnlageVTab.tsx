/**
 * Anlage V Tax Summary Tab Component
 * Annual rental income tax summary — Anlage V (§ 21 EStG)
 */

import { AlertTriangle, Info, Printer } from "lucide-react"
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
import { Logo } from "@/components/Common/Logo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  /** Full address string shown in the PDF print header. */
  propertyAddress?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

// Evaluated at module load time; acceptable because the component re-mounts
// on navigation, which covers any year-boundary edge case without extra state.
const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_YEAR = CURRENT_YEAR - 1
const AVAILABLE_YEARS = Array.from(
  { length: 5 },
  (_, i) => CURRENT_YEAR - 1 - i,
)

// Intentionally rounds to whole euros (no cents) — used only in the chart axis
// via formatEurShort. The KPI cards and table use formatEur from utils (with cents).
const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/******************************************************************************
                              Functions
******************************************************************************/

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
  const { propertyId, propertyAddress } = props
  const [year, setYear] = useState(DEFAULT_YEAR)
  const { data, isLoading, isError } = usePortfolioTaxSummary(propertyId, year)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load tax summary</AlertTitle>
        <AlertDescription>
          There was an error loading the tax summary. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

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

  const printDate = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Use total income (gross rent + other income) so chartData aligns with
  // net_taxable_income = total_income - total_werbungskosten.
  const totalIncome = data.grossRentIncome + data.otherIncome
  const chartData = [
    { name: "Total Income", amount: totalIncome },
    { name: "Total Werbungskosten", amount: data.totalWerbungskosten },
  ]

  return (
    <div className="space-y-6">
      {/* Print-only header — hidden on screen, visible when printing */}
      <div className="hidden print:block">
        <Logo asLink={false} />
        <div className="mt-3">
          <h1 className="text-lg font-bold">
            Anlage V Summary — Tax Year {year}
          </h1>
          {propertyAddress && (
            <p className="text-sm text-gray-600">{propertyAddress}</p>
          )}
        </div>
        <hr className="mt-3 border-gray-300" />
      </div>

      {/* Year selector + Export button — hidden on print */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
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
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Export as PDF
        </Button>
      </div>

      {/* Info banner — hidden on print */}
      <Alert className="print:hidden">
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

      {/* Income vs Werbungskosten chart — hidden on print */}
      <Card className="print:hidden">
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

      {/* Screen-only disclaimer */}
      <p className="text-xs text-muted-foreground print:hidden">
        This is an estimate only. AfA is based on purchase price and building
        year — consult a licensed Steuerberater (tax advisor) before filing.
      </p>

      {/* Print-only footer — hidden on screen */}
      <div className="hidden print:block mt-4 border-t border-gray-300 pt-3 text-xs text-gray-500 space-y-1">
        <p>Generated by HeimPath · {printDate}</p>
        <p>
          Estimate only — consult a licensed Steuerberater before filing. Not a
          substitute for professional tax advice.
        </p>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AnlageVTab }
export default AnlageVTab
