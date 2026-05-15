/**
 * Secure Financing Step Content
 * Three-tab financing guide: finances check → pre-approval → offer comparison.
 * Only renders substantive content for mortgage or mixed financing journeys.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { JourneyStep } from "@/models/journey"
import { useJourneyContext } from "../JourneyContext"
import { FinanceCheck } from "./FinanceCheck"
import { GuidanceCard } from "./GuidanceCard"
import { MortgageComparison } from "./MortgageComparison"
import { MortgagePreapproval } from "./MortgagePreapproval"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

/** Shown for cash buyers in place of the full mortgage guide. */
function CashBuyerNotice() {
  return (
    <GuidanceCard
      title="Paying in Cash"
      description="Your journey is set up for a cash purchase — no mortgage financing required."
      items={[]}
      tip="You can still use the financing calculators to model scenarios or compare with a mortgage purchase."
    />
  )
}

/** Three-tab mortgage guide: check finances, get pre-approved, compare offers. */
function SecureFinancing(props: Readonly<IProps>) {
  const { step } = props
  const { journey } = useJourneyContext()

  if (journey.financing_type === "cash") {
    return <CashBuyerNotice />
  }

  return (
    <Tabs defaultValue="check">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="check">1. Finances</TabsTrigger>
        <TabsTrigger value="preapproval">2. Pre-Approval</TabsTrigger>
        <TabsTrigger value="compare">3. Compare Offers</TabsTrigger>
      </TabsList>
      <TabsContent value="check" className="mt-4">
        <FinanceCheck step={step} />
      </TabsContent>
      <TabsContent value="preapproval" className="mt-4">
        <MortgagePreapproval step={step} />
      </TabsContent>
      <TabsContent value="compare" className="mt-4">
        <MortgageComparison step={step} />
      </TabsContent>
    </Tabs>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SecureFinancing }
