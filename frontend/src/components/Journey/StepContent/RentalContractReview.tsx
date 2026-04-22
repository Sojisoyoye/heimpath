/**
 * Rental Contract Review Step Content
 * Guidance on Mietvertrag clauses, red flags, and tenant rights
 */

import { AlertTriangle, FileText, Scale, ShieldCheck } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalContractReview(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Key Mietvertrag Clauses"
        description="German lease agreements contain important clauses that affect your rights and obligations. Review each section carefully before signing."
        items={[
          {
            icon: FileText,
            label: "Rent & Payment Terms",
            detail:
              "Verify the Kaltmiete (base rent), Nebenkosten (utilities advance), total Warmmiete, payment due date, and landlord's bank details. Rent is typically due on the 3rd business day of each month.",
          },
          {
            icon: AlertTriangle,
            label: "Schonheitsreparaturen (Cosmetic Repairs)",
            detail:
              "Clauses requiring you to repaint or repair at set intervals are often invalid under German law (BGH rulings). Rigid renovation schedules are unenforceable — negotiate removal if present.",
          },
          {
            icon: Scale,
            label: "Rent Escalation Clauses",
            detail:
              "Staffelmiete (step rent) has pre-agreed increases. Indexmiete ties rent to inflation. Standard leases allow increases only up to the Mietspiegel. Know which type your lease uses.",
          },
          {
            icon: ShieldCheck,
            label: "Notice Period (Kundigungsfrist)",
            detail:
              "Standard tenant notice period is 3 months. Landlord notice periods increase with tenancy length (3-9 months). Minimum lease terms (Mindestmietdauer) should be checked carefully.",
          },
        ]}
        tip="If anything is unclear, consider consulting a Mieterverein (tenant association) before signing. Membership costs 50-100 EUR/year and includes legal advice on lease matters."
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalContractReview }
