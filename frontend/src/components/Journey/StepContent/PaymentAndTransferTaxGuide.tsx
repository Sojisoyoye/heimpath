/**
 * Payment and Transfer Tax Step Content
 * Guidance on settling Grunderwerbsteuer and the purchase price payment
 */

import { BadgeCheck, Banknote, Clock, Receipt } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function PaymentAndTransferTaxGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Grunderwerbsteuer (Property Transfer Tax)"
        description="This tax must be paid before you can be entered into the Grundbuch as the owner."
        items={[
          {
            icon: Clock,
            label: "Payment Deadline",
            detail:
              "The tax office (Finanzamt) sends the Grunderwerbsteuerbescheid within a few weeks of signing. You must pay within 4 weeks of the assessment date — late payment incurs interest charges.",
          },
          {
            icon: BadgeCheck,
            label: "Unbedenklichkeitsbescheinigung",
            detail:
              "Once the tax is paid, the Finanzamt issues this clearance certificate. The notary needs this before submitting the full Grundbuch transfer application — keep it safe.",
          },
        ]}
        tip="The tax rate depends on the federal state (Bundesland) — it ranges from 3.5% (Bavaria) to 6.5% (Brandenburg, NRW). Check your state's rate when budgeting."
      />
      <GuidanceCard
        title="Purchase Price Payment"
        description="The purchase price is typically paid via bank transfer after specific conditions are met."
        items={[
          {
            icon: Banknote,
            label: "Fälligkeit (Payment Trigger)",
            detail:
              "The notary sends a Fälligkeitsmitteilung when all conditions are satisfied: Auflassungsvormerkung entered, Grunderwerbsteuer cleared, any existing loans released (Löschungsbewilligung). Do not pay before this notice.",
          },
          {
            icon: Receipt,
            label: "Keep All Receipts",
            detail:
              "Retain bank transfer confirmations, tax assessments, and the Unbedenklichkeitsbescheinigung. These documents are needed for your tax return and any future sale of the property.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PaymentAndTransferTaxGuide }
