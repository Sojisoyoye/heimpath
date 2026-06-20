/**
 * Find And Evaluate Guide Step Content
 * Tabbed guidance for searching and evaluating German properties
 */

import { BarChart2, Building2, MapPin } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GuidanceCard } from "./GuidanceCard"
import type { IPlatformLink } from "./PlatformLinksGrid"
import { PlatformLinksGrid } from "./PlatformLinksGrid"
import { PropertyEvaluationSummary } from "./PropertyEvaluationSummary"

interface IProps {
  journeyId: string
  stepId: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const BUYING_PORTALS: readonly IPlatformLink[] = [
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
    name: "Kleinanzeigen",
    url: "https://www.kleinanzeigen.de",
    description: "Private seller listings and deals",
    analyticsId: "kleinanzeigen",
  },
]

/******************************************************************************
                              Components
******************************************************************************/

function FindAndEvaluateGuide(props: Readonly<IProps>) {
  const { journeyId, stepId } = props

  return (
    <Tabs defaultValue="find">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="find">Find Properties</TabsTrigger>
        <TabsTrigger value="evaluate">Evaluate & Calculate</TabsTrigger>
      </TabsList>
      <TabsContent value="find" className="mt-4 space-y-4">
        <GuidanceCard
          title="Finding Properties in Germany"
          description="Use the right platforms and criteria to narrow your search efficiently."
          items={[
            {
              icon: MapPin,
              label: "Location Research",
              detail:
                "Evaluate the Lage (location) carefully — proximity to transport, schools, amenities, and future development plans all affect value and rental demand.",
            },
            {
              icon: Building2,
              label: "Property Types to Compare",
              detail:
                "Compare Eigentumswohnung (flat), Reihenhaus (terraced house), and Einfamilienhaus (detached). Each has different cost structures and maintenance obligations.",
            },
          ]}
          tip="Set up email alerts on each portal for your target location and budget — new listings in popular areas are claimed within 48 hours."
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Search Portals
          </p>
          <PlatformLinksGrid platforms={BUYING_PORTALS} />
        </div>

        <GuidanceCard
          title="Evaluating Properties"
          description="Assess each property beyond the asking price before committing."
          items={[
            {
              icon: BarChart2,
              label: "Price Per Square Metre",
              detail:
                "Compare the €/m² against recent sales in the same postcode using the Kaufpreissammlung or local Gutachterausschuss reports.",
            },
          ]}
        />
      </TabsContent>
      <TabsContent value="evaluate" className="mt-4">
        <PropertyEvaluationSummary journeyId={journeyId} stepId={stepId} />
      </TabsContent>
    </Tabs>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FindAndEvaluateGuide }
