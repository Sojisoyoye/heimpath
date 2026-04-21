/**
 * Rental Landlord Law Step Content
 * Guidance on German Mietrecht, tenant protections, and landlord obligations
 */

import {
  AlertTriangle,
  FileText,
  Gavel,
  Scale,
  ShieldCheck,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalLandlordLaw(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="German Tenant Protection (Mietrecht)"
        description="Germany has some of the strongest tenant protections in Europe. Understanding these laws is essential before becoming a landlord."
        items={[
          {
            icon: Scale,
            label: "BGB Mietrecht (§535-580a)",
            detail:
              "The German Civil Code defines landlord and tenant rights. Key areas: rent increases, maintenance obligations, deposit limits, and termination rules.",
          },
          {
            icon: Gavel,
            label: "Mietpreisbremse (Rent Control)",
            detail:
              "In designated areas, new rents cannot exceed 10% above the local Mietspiegel (rent index). Check if your property's location is covered.",
          },
          {
            icon: ShieldCheck,
            label: "Kundigungsschutz (Eviction Protection)",
            detail:
              "Tenants have strong eviction protections. Landlords can only terminate leases for specific legal reasons (Eigenbedarf, breach of contract, or economic exploitation).",
          },
        ]}
        tip="German courts generally favor tenants in disputes. Always document everything in writing and consult a lawyer before attempting any lease termination."
      />
      <GuidanceCard
        title="Key Regulations"
        description="Financial and contractual rules every landlord must follow."
        items={[
          {
            icon: FileText,
            label: "Kaution (Security Deposit)",
            detail:
              "Maximum 3 months' cold rent (Kaltmiete). Must be held in a separate, interest-bearing account. Return within 6 months of lease end.",
          },
          {
            icon: AlertTriangle,
            label: "Zweckentfremdungsverbot",
            detail:
              "In major cities (Berlin, Munich, Hamburg), converting residential property to short-term rental (e.g. Airbnb) may be prohibited or require a permit.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalLandlordLaw }
