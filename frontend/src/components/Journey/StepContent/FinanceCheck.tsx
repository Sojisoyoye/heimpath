/**
 * Finance Check Step Content
 * Guidance for assessing financial situation before property purchase
 */

import { BadgeCheck, CreditCard, FileText, PiggyBank } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function FinanceCheck(_props: Readonly<IProps>) {
  return (
    <GuidanceCard
      title="Assess Your Financial Position"
      description="Understanding your financial situation is the foundation for a successful property purchase."
      items={[
        {
          icon: PiggyBank,
          label: "Equity & Savings",
          detail:
            "German banks typically require 20–30% of the purchase price as equity (including closing costs). Add up all liquid savings, investments, and gifts you can use.",
        },
        {
          icon: FileText,
          label: "Income Documentation",
          detail:
            "Gather your last 3 salary slips, tax returns, and employment contract. Self-employed buyers need 2–3 years of profit-and-loss statements.",
        },
        {
          icon: BadgeCheck,
          label: "SCHUFA Credit Score",
          detail:
            "Request a free SCHUFA self-disclosure once per year at schufa.de. A score above 97% is considered excellent for mortgage applications.",
        },
        {
          icon: CreditCard,
          label: "Borrowing Capacity",
          detail:
            "A rough rule: banks lend up to 4–5x your annual gross income. Monthly repayments should stay below 35% of your net income.",
        },
      ]}
      tip="Use the Financing Eligibility calculator to get a personalised estimate of how much you may be able to borrow before approaching lenders."
      ctaLabel="Check Financing Eligibility"
      ctaHref="/calculators"
      ctaSearch={{ tab: "financing" }}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FinanceCheck }
