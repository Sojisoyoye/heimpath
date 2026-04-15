/**
 * Shared Property Evaluation Page
 * Public read-only view of a shared property evaluation — no auth required.
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { formatEur } from "@/common/utils"
import {
  EUR_FORMATTER_2 as CURRENCY_FORMATTER,
  PERCENT_FORMATTER,
} from "@/common/utils/formatters"
import {
  AnnualCashflowTable,
  EvaluationSection,
} from "@/components/Calculators/PropertyEvaluationCalculator/sections"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePropertyEvaluationByShareId } from "@/hooks/queries/useCalculatorQueries"
import type { PropertyEvaluationRecord } from "@/models/propertyEvaluation"

export const Route = createFileRoute("/shared/evaluation/$shareId")({
  component: SharedEvaluationPage,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Mini card for a single input field. */
function InputCard(props: { label: string; value: string }) {
  const { label, value } = props

  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  )
}

/** Read-only summary of the evaluation inputs. */
function SharedInputSummary(props: { evaluation: PropertyEvaluationRecord }) {
  const { evaluation } = props
  const { propertyInfo, rent, operatingCosts, financing } = evaluation.inputs

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Property Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Property Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0">
          {propertyInfo.address && (
            <div className="col-span-2 rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium text-sm">{propertyInfo.address}</p>
            </div>
          )}
          <InputCard label="Size" value={`${propertyInfo.squareMeters} m²`} />
          <InputCard
            label="Purchase Price"
            value={formatEur(propertyInfo.purchasePrice)}
          />
          <InputCard
            label="Broker Fee"
            value={`${propertyInfo.brokerFeePercent}%`}
          />
          <InputCard
            label="Transfer Tax"
            value={`${propertyInfo.transferTaxPercent}%`}
          />
        </CardContent>
      </Card>

      {/* Rent Parameters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Rent Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0">
          <InputCard
            label="Rent / m²"
            value={CURRENCY_FORMATTER.format(rent.rentPerSqm)}
          />
          <InputCard
            label="Parking Rent"
            value={CURRENCY_FORMATTER.format(rent.parkingRent)}
          />
          <InputCard
            label="Tax Rate"
            value={PERCENT_FORMATTER.format(rent.marginalTaxRatePercent / 100)}
          />
          <InputCard
            label="Analysis Period"
            value={`${rent.analysisYears} years`}
          />
        </CardContent>
      </Card>

      {/* Operating Costs */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Operating Costs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0">
          <InputCard
            label="Hausgeld (allocable)"
            value={CURRENCY_FORMATTER.format(operatingCosts.hausgeldAllocable)}
          />
          <InputCard
            label="Property Tax"
            value={CURRENCY_FORMATTER.format(operatingCosts.propertyTaxMonthly)}
          />
          <InputCard
            label="Hausgeld (non-alloc.)"
            value={CURRENCY_FORMATTER.format(
              operatingCosts.hausgeldNonAllocable,
            )}
          />
          <InputCard
            label="Reserves"
            value={CURRENCY_FORMATTER.format(operatingCosts.reservesPortion)}
          />
        </CardContent>
      </Card>

      {/* Financing */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Financing</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0">
          <InputCard label="Loan" value={`${financing.loanPercent}%`} />
          <InputCard
            label="Interest Rate"
            value={`${financing.interestRatePercent}%`}
          />
          <InputCard
            label="Repayment Rate"
            value={`${financing.repaymentRatePercent}%`}
          />
          <InputCard
            label="Incl. Closing Costs"
            value={financing.includeAcquisitionCosts ? "Yes" : "No"}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/** CTA footer linking to signup. */
function SharedFooter() {
  return (
    <div className="rounded-lg border bg-muted/50 p-6 text-center">
      <p className="text-lg font-semibold mb-2">
        Create your own evaluation on HeimPath
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Analyze investment properties, track your buying journey, and more.
      </p>
      <Button asChild>
        <Link to="/signup">
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

/** Default component. Shared evaluation page. */
function SharedEvaluationPage() {
  const { shareId } = Route.useParams()
  const { data, isLoading, isError } = usePropertyEvaluationByShareId(shareId)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Evaluation not found</h1>
          <p className="text-muted-foreground">
            This shared evaluation link may be invalid or expired.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const evaluation = data
  const isOwnerOccupier =
    evaluation.results.totalColdRentMonthly === 0 &&
    evaluation.results.warmRentMonthly === 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">
            {evaluation.name || "Property Evaluation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Shared property evaluation — read-only view
          </p>
        </div>

        {/* Input Summary */}
        <SharedInputSummary evaluation={evaluation} />

        {/* Results */}
        <EvaluationSection
          results={evaluation.results}
          isOwnerOccupier={isOwnerOccupier}
        />

        {/* Annual Cashflow Table */}
        {!isOwnerOccupier && evaluation.results.annualRows.length > 0 && (
          <AnnualCashflowTable rows={evaluation.results.annualRows} />
        )}

        {/* CTA Footer */}
        <SharedFooter />
      </div>
    </div>
  )
}
