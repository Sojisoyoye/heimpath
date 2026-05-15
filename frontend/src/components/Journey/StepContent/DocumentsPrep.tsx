/**
 * Documents Preparation Step Content
 * Guidance on gathering all personal and financial documents before making an offer
 */

import { Briefcase, CreditCard, Euro, FileText } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function DocumentsPrep(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Personal Identity Documents"
        description="All parties purchasing the property must provide valid identification."
        items={[
          {
            icon: CreditCard,
            label: "Passport or National ID",
            detail:
              "Both buyer and co-buyers need a valid passport or EU national ID card. Non-EU buyers should also have their residence permit (Aufenthaltstitel) ready.",
          },
          {
            icon: FileText,
            label: "Marital Status Certificate",
            detail:
              "Married buyers may need a Heiratsurkunde (marriage certificate). If purchasing jointly, both partners must be present at the notary signing.",
          },
        ]}
        tip="Have certified German translations ready for any documents not in German. The notary may require Apostille-certified copies for non-EU documents."
      />
      <GuidanceCard
        title="Financial Documents"
        description="Lenders and the notary will request evidence of your financial position."
        items={[
          {
            icon: Euro,
            label: "Bank Statements",
            detail:
              "Provide statements from the last 3 months showing your equity and regular income. Unusual large deposits may need an explanation letter (Herkunftsnachweis).",
          },
          {
            icon: Briefcase,
            label: "Income and Tax Documents",
            detail:
              "Last 3 payslips (Gehaltsabrechnungen), most recent Steuerbescheid, and employment contract. Self-employed: 2 years of BWA and tax returns. Freelancers: client contracts and income statements.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DocumentsPrep }
