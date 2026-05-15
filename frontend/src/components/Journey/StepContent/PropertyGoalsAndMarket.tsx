/**
 * Property Goals and Market Step Content
 * Combines goal-setting form with local market insights in one step
 */

import type { MarketInsightsData, PropertyGoals } from "@/models/journey"
import { MarketInsights } from "./MarketInsights"
import { PropertyGoalsForm } from "./PropertyGoalsForm"

interface IProps {
  journeyId: string
  propertyLocation?: string
  propertyType?: string
  budgetEuros?: number
  propertyGoals?: PropertyGoals
  marketInsights?: MarketInsightsData
}

/******************************************************************************
                              Components
******************************************************************************/

/** Renders property goals form followed by market insights for the user's target location. */
function PropertyGoalsAndMarket(props: Readonly<IProps>) {
  const {
    journeyId,
    propertyLocation,
    propertyType,
    budgetEuros,
    propertyGoals,
    marketInsights,
  } = props

  return (
    <div className="space-y-4">
      <PropertyGoalsForm
        journeyId={journeyId}
        initialGoals={propertyGoals}
        propertyLocation={propertyLocation}
      />
      <MarketInsights
        propertyLocation={propertyLocation}
        propertyType={propertyType}
        budgetEuros={budgetEuros}
        propertyGoals={propertyGoals}
        marketInsights={marketInsights}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyGoalsAndMarket }
