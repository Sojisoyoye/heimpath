/**
 * Mortgage Comparison Step Content
 * Guidance for comparing mortgage offers from multiple lenders
 */

import {
  ArrowDownUp,
  Calculator,
  CalendarClock,
  FileSearch,
  Repeat2,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgageComparison(_props: Readonly<IProps>) {
  return (
    <GuidanceCard
      title="Compare Mortgage Offers"
      description="Once you have offers from multiple lenders, compare them carefully before committing. The best headline rate is rarely the best overall deal."
      items={[
        {
          icon: Calculator,
          label: "Effektivzins — the Only Fair Comparison Metric",
          detail:
            "Always compare the Effektivzins (APRC), not the Sollzins. The APRC includes all mandatory fees and gives a true cost-per-year figure. German banks must disclose it by law.",
        },
        {
          icon: CalendarClock,
          label: "Zinsbindungsfrist (Fixed-Rate Period)",
          detail:
            "German mortgages typically fix the rate for 5–20 years. Longer fixes (15–20 yrs) provide stability but cost more. Shorter periods (10 yrs) work if you expect rates to fall or plan to sell.",
        },
        {
          icon: ArrowDownUp,
          label: "Tilgungsrate (Repayment Rate)",
          detail:
            "The minimum is often 1%, but 2–3% is recommended. Higher initial repayment means less total interest and faster equity build-up — use the amortisation calculator to model this.",
        },
        {
          icon: Repeat2,
          label: "Sondertilgung & Anschlussfinanzierung",
          detail:
            "Check: annual overpayment allowance (target 5–10%), costs to exit early, and whether the bank offers a follow-on rate (Anschlussfinanzierung) for when the fixed period ends.",
        },
        {
          icon: FileSearch,
          label: "ESIS — European Standard Information Sheet",
          detail:
            "Every lender must provide a standardised ESIS document. Request it from all lenders and use it for a like-for-like comparison before signing any offer.",
        },
      ]}
      tip="Run the Mortgage Amortisation Calculator with each offer's rate and repayment to see the exact total cost over time. Small differences compound significantly over 20+ years."
      ctaLabel="Open Amortisation Calculator"
      ctaHref="/calculators"
      ctaSearch={{ tab: "mortgage" }}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageComparison }
