/**
 * Journey Summary Component
 * Review summary for journey wizard before submission
 */

import { Sparkles } from "lucide-react"
import { GERMAN_STATES } from "@/common/constants"
import { formatDate, formatEur } from "@/common/utils"
import type {
  FinancingType,
  JourneyType,
  PropertyType,
  ResidencyStatus,
} from "@/models/journey"

/******************************************************************************
                              Types
******************************************************************************/

export interface WizardState {
  journeyType?: JourneyType
  propertyType?: PropertyType
  propertyUse?: "live_in" | "rent_out"
  targetState?: string
  financingType?: FinancingType
  budgetMin?: number
  budgetMax?: number
  targetDate?: string
  residencyStatus?: ResidencyStatus
}

interface IProps {
  state: WizardState
}

/******************************************************************************
                              Constants
******************************************************************************/

const RESIDENCY_LABELS: Record<ResidencyStatus, string> = {
  german_citizen: "German citizen",
  eu_citizen: "EU/EEA citizen",
  non_eu_resident: "Non-EU resident in Germany",
  non_resident: "Non-resident",
}

const PROPERTY_USE_LABELS: Record<string, string> = {
  live_in: "Live in it",
  rent_out: "Rent it out",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Summary review before submission. */
function JourneySummary(props: IProps) {
  const { state } = props

  const isRental = state.journeyType === "rental"

  const stateName =
    GERMAN_STATES.find((s) => s.code === state.targetState)?.name ||
    state.targetState

  const formatMonthYear = (dateStr?: string) =>
    formatDate(dateStr, { month: "long", year: "numeric" }, "Not specified")

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Your Journey</h3>
        <p className="text-sm text-muted-foreground">
          {isRental
            ? "Here's a summary of your apartment rental journey"
            : "Here's a summary of your property buying journey"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Journey Type</p>
          <p className="font-medium">
            {isRental ? "Rent Apartment" : "Buy Property"}
          </p>
        </div>
        {!isRental && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Property Type</p>
            <p className="font-medium capitalize">
              {state.propertyType?.replace("_", " ")}
            </p>
          </div>
        )}
        {!isRental && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Purpose</p>
            <p className="font-medium">
              {state.propertyUse
                ? PROPERTY_USE_LABELS[state.propertyUse]
                : "Not specified"}
            </p>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Location</p>
          <p className="font-medium">{stateName}</p>
        </div>
        {!isRental && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Financing</p>
            <p className="font-medium capitalize">
              {state.financingType?.replace("_", " ")}
            </p>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {isRental ? "Monthly Budget" : "Budget Range"}
          </p>
          <p className="font-medium">
            {state.budgetMin || state.budgetMax
              ? `${formatEur(state.budgetMin)} - ${formatEur(state.budgetMax)}`
              : "Not specified"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Target Date</p>
          <p className="font-medium">{formatMonthYear(state.targetDate)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Residency Status</p>
          <p className="font-medium">
            {state.residencyStatus
              ? RESIDENCY_LABELS[state.residencyStatus]
              : "Not specified"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <Sparkles className="h-5 w-5 shrink-0 text-green-600" />
        <div className="text-sm">
          <p className="font-medium text-green-900 dark:text-green-100">
            Ready to create your journey!
          </p>
          <p className="text-green-800 dark:text-green-200">
            We'll generate a personalized step-by-step guide based on your
            profile. You can always update your preferences later.
          </p>
        </div>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneySummary }
