/**
 * Journey Layout Route
 * Parent route for journey detail and its child routes (e.g. property evaluation)
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/journeys/$journeyId")({
  component: JourneyLayout,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Layout wrapper that renders child routes. */
function JourneyLayout() {
  return <Outlet />
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneyLayout
