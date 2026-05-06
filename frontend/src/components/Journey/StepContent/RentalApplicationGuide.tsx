/**
 * Rental Application Guide Step Content
 * Guidance on SCHUFA, Selbstauskunft, application documents, and cover letters
 */

import { CreditCard, FileCheck, FileText, UserCheck } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalApplicationGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Essential Application Documents"
        description="German landlords expect a complete application package. Having all documents ready gives you a significant advantage."
        items={[
          {
            icon: CreditCard,
            label: "SCHUFA Auskunft",
            detail:
              "Request your SCHUFA credit report at meineschufa.de. The 'SCHUFA-BonitatsAuskunft' (29.95 EUR) is specifically designed for landlords. Free annual report (Datenkopie) is also available but less accepted.",
          },
          {
            icon: FileText,
            label: "Mietschuldenfreiheitsbescheinigung",
            detail:
              "A confirmation from your previous landlord that you have no outstanding rent debts. If you're new to Germany, a bank statement showing regular rent payments may substitute.",
          },
          {
            icon: UserCheck,
            label: "Selbstauskunft (Self-Disclosure)",
            detail:
              "A standardized form with your personal and financial details. Download a template or use the one provided by the landlord. Include employment status and monthly net income.",
          },
          {
            icon: FileCheck,
            label: "Income Proof",
            detail:
              "Last 3 months' pay slips (Gehaltsabrechnungen) and/or employment contract. Landlords typically expect rent to be no more than 1/3 of your net income.",
          },
        ]}
        tip="Write a brief, friendly cover letter introducing yourself. Mention your profession, why you're moving, and that you're a reliable tenant. A personal touch can make the difference."
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalApplicationGuide }
