/**
 * Portfolio Overview Page
 * Manage rental properties and track financial performance
 */

import { createFileRoute } from "@tanstack/react-router"
import { PortfolioPage } from "@/components/Portfolio"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/portfolio/")({
  component: PortfolioOverviewPage,
  head: () => ({
    meta: [{ title: "Portfolio - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Portfolio overview page. */
function PortfolioOverviewPage() {
  return <PortfolioPage />
}

/******************************************************************************
                              Export
******************************************************************************/

export default PortfolioOverviewPage
