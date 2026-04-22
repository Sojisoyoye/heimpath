/**
 * Rental Search Guide Step Content
 * Guidance on apartment search portals, requirements, and what to look for
 */

import { Globe, ListChecks, MapPin, Newspaper } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalSearchGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Finding an Apartment in Germany"
        description="The German rental market can be competitive, especially in major cities. Preparation and quick responses are key."
        items={[
          {
            icon: Globe,
            label: "Online Portals",
            detail:
              "ImmoScout24 and Immowelt are the main platforms. Set up alerts for new listings matching your criteria. WG-Gesucht is popular for shared apartments.",
          },
          {
            icon: MapPin,
            label: "Location Research",
            detail:
              "Research neighborhoods by commute time, amenities, and safety. Rent varies significantly between city districts — check the local Mietspiegel for fair prices.",
          },
          {
            icon: Newspaper,
            label: "Local Networks",
            detail:
              "Check local newspaper classifieds, Facebook groups, and community bulletin boards. Some landlords don't advertise online.",
          },
          {
            icon: ListChecks,
            label: "Requirements Checklist",
            detail:
              "Know your budget (Kaltmiete + Nebenkosten), minimum size, preferred room count, and must-have features before you start searching.",
          },
        ]}
        tip="In competitive markets like Berlin or Munich, respond to listings within hours and have your application documents ready to send immediately."
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalSearchGuide }
