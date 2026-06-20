/**
 * Rental Search Guide Step Content
 * Guidance on apartment search portals, requirements, and what to look for
 */

import { ListChecks, MapPin, Newspaper } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"
import type { IPlatformLink } from "./PlatformLinksGrid"
import { PlatformLinksGrid } from "./PlatformLinksGrid"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Constants
******************************************************************************/

const RENTAL_PORTALS: readonly IPlatformLink[] = [
  {
    name: "ImmoScout24",
    url: "https://www.immobilienscout24.de",
    description: "Germany's largest property portal",
    analyticsId: "immoscout24",
  },
  {
    name: "Immowelt",
    url: "https://www.immowelt.de",
    description: "Wide selection of apartments and houses",
    analyticsId: "immowelt",
  },
  {
    name: "Immonet",
    url: "https://www.immonet.de",
    description: "Verified private and agent listings",
    analyticsId: "immonet",
  },
  {
    name: "WG-Gesucht",
    url: "https://www.wg-gesucht.de",
    description: "Most popular platform for shared flats",
    analyticsId: "wg-gesucht",
  },
]

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
        tip="Set up email alerts on each portal so new listings reach you within minutes. In competitive markets like Berlin or Munich, respond within hours and have your application documents ready to send immediately."
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Search Portals
        </p>
        <PlatformLinksGrid platforms={RENTAL_PORTALS} />
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalSearchGuide }
