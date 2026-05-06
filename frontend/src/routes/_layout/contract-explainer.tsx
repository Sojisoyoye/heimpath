/**
 * Contract Explainer Route
 * AI-powered Kaufvertrag clause-by-clause analysis
 */

import { createFileRoute } from "@tanstack/react-router"
import { ContractExplainerPage } from "@/components/ContractExplainer/ContractExplainerPage"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/contract-explainer")({
  component: ContractExplainerPage,
  head: () => ({
    meta: [{ title: "Contract Explainer - HeimPath" }],
  }),
})

/******************************************************************************
                              Export
******************************************************************************/

export default ContractExplainerPage
