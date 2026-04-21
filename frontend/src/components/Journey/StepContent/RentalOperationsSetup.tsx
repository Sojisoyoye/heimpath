/**
 * Rental Operations Setup Step Content
 * Guidance for lease preparation, tenant screening, utility accounting, and handover
 */

import {
  ClipboardCheck,
  FileText,
  Receipt,
  Shield,
  UserCheck,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalOperationsSetup(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Lease & Tenant Screening"
        description="Prepare your rental agreement and establish a solid tenant screening process."
        items={[
          {
            icon: FileText,
            label: "Mietvertrag (Lease Agreement)",
            detail:
              "Use a standard German lease template (available from Haus & Grund or IVD). Key clauses: rent amount, Nebenkosten prepayment, Kaution, pet policy, and renovation obligations (Schoenheitsreparaturen).",
          },
          {
            icon: UserCheck,
            label: "Tenant Screening",
            detail:
              "Request a SCHUFA credit check (Bonitaetsauskunft), last 3 salary slips, employer confirmation, and previous landlord reference. Verify identity with a valid ID.",
          },
          {
            icon: Shield,
            label: "Landlord Insurance",
            detail:
              "Ensure you have Haus- und Grundbesitzerhaftpflicht (property liability insurance) before tenants move in. Consider Mietausfallversicherung (rent default insurance) for additional protection.",
          },
        ]}
        tip="Never discriminate in tenant selection based on protected characteristics (AGG — Allgemeines Gleichbehandlungsgesetz). Document your selection criteria objectively."
      />
      <GuidanceCard
        title="Operations & Handover"
        description="Set up utility accounting and prepare for the tenant move-in."
        items={[
          {
            icon: Receipt,
            label: "Nebenkostenabrechnung (Utility Accounting)",
            detail:
              "You must provide tenants with an annual utility cost statement within 12 months of the billing period. Include heating (HeizkostenV), water, waste, building insurance, and property tax.",
          },
          {
            icon: ClipboardCheck,
            label: "Wohnungsubergabeprotokoll (Handover Protocol)",
            detail:
              "Document the apartment condition at move-in with photos and meter readings. Both parties sign the protocol — this protects you when the tenant moves out.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalOperationsSetup }
