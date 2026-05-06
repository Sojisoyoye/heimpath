/**
 * Property Detail Page
 * Displays full property info with transactions
 */

import { createFileRoute } from "@tanstack/react-router"
import { PropertyDetailPage } from "@/components/Portfolio"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/portfolio/$propertyId")({
  component: PropertyDetailRoute,
  head: () => ({
    meta: [{ title: "Property - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property detail page. */
function PropertyDetailRoute() {
  const { propertyId } = Route.useParams()
  return <PropertyDetailPage propertyId={propertyId} />
}

/******************************************************************************
                              Export
******************************************************************************/

export default PropertyDetailRoute
