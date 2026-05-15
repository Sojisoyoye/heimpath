/**
 * Loan Commitment Step Content
 * Guidance on securing a binding mortgage offer (Darlehenszusage)
 */

import { BadgeEuro, FileCheck, Percent, TrendingDown } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function LoanCommitmentGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="From Confirmation to Binding Offer"
        description="A Finanzierungsbestätigung is not a legally binding commitment — get the full Darlehenszusage before signing."
        items={[
          {
            icon: FileCheck,
            label: "Submit the Final Loan Application",
            detail:
              "Provide the signed Kaufvertragsentwurf, current property Exposé, Grundbuchauszug, and your income documents. The bank will commission a property valuation (Beleihungswertermittlung).",
          },
          {
            icon: BadgeEuro,
            label: "Darlehenszusage (Binding Offer)",
            detail:
              "Once approved, you'll receive the loan agreement. You have a 14-day statutory withdrawal period (Widerrufsrecht) after signing — use this time for a final legal review.",
          },
        ]}
        tip="Lock in your interest rate with a Zinsbindungsfrist. Rates fixed for 10–15 years offer planning security; shorter terms have lower rates but expose you to refinancing risk."
      />
      <GuidanceCard
        title="Rate and Repayment Choices"
        description="Structuring your mortgage well saves tens of thousands over the loan term."
        items={[
          {
            icon: Percent,
            label: "Fixed vs. Variable Rate",
            detail:
              "Fixed rates (Festzins) dominate the German market. Variable rates (variable Zinsen) are rare and risky. Most buyers fix for 10 years and reassess at Anschlussfinanzierung.",
          },
          {
            icon: TrendingDown,
            label: "Tilgung (Repayment Rate)",
            detail:
              "A minimum 2–3% Tilgung is recommended. At 1% you'd take ~40 years to repay. Higher Tilgung reduces total interest significantly — model scenarios with your bank before signing.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LoanCommitmentGuide }
