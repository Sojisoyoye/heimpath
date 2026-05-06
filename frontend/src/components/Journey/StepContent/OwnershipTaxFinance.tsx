/**
 * Ownership Tax & Finance Step Content
 * Guidance for property tax registration, mortgage tracking, and tax filing
 */

import {
  Calculator,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipTaxFinance(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Grundsteuer (Property Tax)"
        description="All property owners in Germany must pay Grundsteuer to their local municipality."
        items={[
          {
            icon: Landmark,
            label: "Register at Your Local Finanzamt",
            detail:
              "The Finanzamt will send you a Grundsteuerbescheid (property tax assessment) after purchase. This can take several months to arrive.",
          },
          {
            icon: CreditCard,
            label: "Set Up Payment",
            detail:
              "Grundsteuer is typically paid quarterly (Feb, May, Aug, Nov) or annually in advance. Set up a Dauerauftrag to avoid missed payments.",
          },
          {
            icon: Calculator,
            label: "Typical Amounts",
            detail:
              "Grundsteuer varies widely by municipality — expect 200-800 EUR/year for a typical apartment, more for houses. The Hebesatz (multiplier) differs per city.",
          },
        ]}
        tip="Since the 2025 Grundsteuer reform, tax assessments are based on new property valuations. Check your Grundsteuerwertbescheid for accuracy and file an objection (Einspruch) within one month if incorrect."
        ctaLabel="Find a Tax Advisor"
        ctaHref="/professionals"
        ctaSearch={{ type: "tax_advisor" }}
      />
      <GuidanceCard
        title="Ongoing Financial Management"
        description="Track your mortgage costs and keep records for tax deductions."
        items={[
          {
            icon: Receipt,
            label: "Mortgage Tracking",
            detail:
              "Request an annual Zinsbescheinigung (interest statement) from your bank. Mortgage interest is tax-deductible for rental properties.",
          },
          {
            icon: FileText,
            label: "Expense Records",
            detail:
              "Keep all property-related receipts organized: maintenance, repairs, insurance premiums, Hausgeld, and professional fees. These are deductible for rental income.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipTaxFinance }
