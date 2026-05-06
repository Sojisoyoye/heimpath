/**
 * Ownership Insurance Step Content
 * Guidance for securing essential property insurance coverage
 */

import { Building2, CloudRain, Home, Shield, Umbrella } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipInsurance(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Essential Insurance"
        description="Protect your investment with the right insurance policies."
        items={[
          {
            icon: Building2,
            label: "Wohngebaudeversicherung (Building Insurance)",
            detail:
              "Covers the structure against fire, storm, water damage, and hail. This is the most important policy — often required by your mortgage lender.",
          },
          {
            icon: Shield,
            label: "Haus- und Grundbesitzerhaftpflicht (Property Liability)",
            detail:
              "Covers third-party injury or damage on your property (e.g. someone slips on icy walkway). Essential for landlords.",
          },
          {
            icon: Home,
            label: "Hausratversicherung (Contents Insurance)",
            detail:
              "Covers your personal belongings inside the property against theft, fire, and water damage. Relevant if you live in the property.",
          },
        ]}
        tip="Compare at least 3 quotes before choosing. Annual premiums for building insurance typically range from 150-500 EUR depending on location and property size."
      />
      <GuidanceCard
        title="Optional Coverage"
        description="Consider additional protection based on your property's location and type."
        items={[
          {
            icon: CloudRain,
            label: "Elementarschadenversicherung (Natural Disaster)",
            detail:
              "Covers flooding, earthquakes, landslides, and heavy snowfall. Increasingly important due to climate change — check your region's risk level.",
          },
          {
            icon: Umbrella,
            label: "WEG Building Insurance (Apartments)",
            detail:
              "If you own an apartment, the WEG (owners' association) typically has a joint building insurance policy. Verify your unit is covered.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipInsurance }
