/**
 * Ownership Management Step Content
 * Guidance for setting up property management, condo admin, and maintenance
 */

import {
  Building2,
  CreditCard,
  Hammer,
  Recycle,
  ThermometerSun,
  Users,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipManagement(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Apartment Owners (WEG)"
        description="If you own an apartment, you'll interact with the owners' association and property management."
        items={[
          {
            icon: Users,
            label: "WEG-Verwaltung (Property Administration)",
            detail:
              "Contact the WEG-Verwaltung to register as the new owner. They manage communal areas, finances, and organize the annual Eigentumerversammlung (owners' meeting).",
          },
          {
            icon: CreditCard,
            label: "Hausgeld Payments",
            detail:
              "Set up a Dauerauftrag (standing order) for monthly Hausgeld — typically 2-4 EUR/sqm covering maintenance reserves, building insurance, and communal services.",
          },
          {
            icon: Building2,
            label: "Teilungserklarung & Hausordnung",
            detail:
              "Review the declaration of division (Teilungserklarung) to understand your rights and obligations. The Hausordnung defines house rules for all owners.",
          },
        ]}
        tip="Attend the annual owners' meeting (Eigentumerversammlung) — important decisions about renovations and special levies (Sonderumlage) are made there."
      />
      <GuidanceCard
        title="House Owners & General"
        description="Ongoing property maintenance and local registrations."
        items={[
          {
            icon: Hammer,
            label: "Maintenance Planning",
            detail:
              "Budget 1-2% of the property value annually for maintenance. Build a network of reliable local tradespeople (plumber, electrician, roofer).",
          },
          {
            icon: Recycle,
            label: "Waste Collection (Mullabfuhr)",
            detail:
              "Register for waste collection service with your local municipality. Choose the right bin sizes to keep Nebenkosten reasonable.",
          },
          {
            icon: ThermometerSun,
            label: "Heating Inspection",
            detail:
              "Schedule an annual Heizungswartung (heating system maintenance). It's legally required for gas systems and keeps your system efficient.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipManagement }
