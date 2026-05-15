/**
 * Find And Evaluate Guide Step Content
 * Tabbed guidance for searching and evaluating German properties
 */

import { BarChart2, Building2, MapPin, Search } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GuidanceCard } from "./GuidanceCard"
import { PropertyEvaluationSummary } from "./PropertyEvaluationSummary"

interface IProps {
  journeyId: string
  stepId: string
}

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
              icon: Search,
              label: "Major Listing Portals",
              detail:
                "Search on Immobilienscout24, Immowelt, and Kleinanzeigen. Set up alerts for your target location, size, and budget to catch new listings early.",
            },
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
          tip="The first 48 hours after a listing goes live are critical. Properties in high-demand areas often receive multiple offers within days."
        />
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
