/**
 * Rental Property Management Step Content
 * Guidance on self-management vs Hausverwaltung and maintenance obligations
 */

import { Building2, Euro, MessageSquare, Wrench } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalPropertyManagement(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Management Options"
        description="Decide how you'll manage your rental property day-to-day."
        items={[
          {
            icon: Building2,
            label: "Hausverwaltung (Property Management Agency)",
            detail:
              "Professional management typically costs 20-35 EUR/unit/month. They handle tenant communication, rent collection, repairs, and legal compliance. Ideal for remote investors or multiple properties.",
          },
          {
            icon: Euro,
            label: "Self-Management",
            detail:
              "Saves the management fee but requires time and knowledge of German rental law. You'll need to handle tenant inquiries, maintenance requests, and the annual Nebenkostenabrechnung yourself.",
          },
        ]}
        tip="Even if you self-manage, keep a Hausverwaltung contact ready as a backup. Some issues (legal disputes, emergency repairs) benefit from professional handling."
      />
      <GuidanceCard
        title="Ongoing Responsibilities"
        description="Key landlord duties regardless of your management approach."
        items={[
          {
            icon: MessageSquare,
            label: "Tenant Communication",
            detail:
              "Respond to tenant requests promptly. German law requires timely repair of defects that affect habitability — delays can lead to rent reductions (Mietminderung).",
          },
          {
            icon: Wrench,
            label: "Maintenance Obligations",
            detail:
              "Landlords must maintain the property in a habitable condition (Instandhaltungspflicht). Budget for regular maintenance and build a reserve for unexpected repairs.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalPropertyManagement }
