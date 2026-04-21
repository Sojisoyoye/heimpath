/**
 * Rental Yield Analysis Step Content
 * Guidance on calculating rental returns and assessing investment viability
 */

import { BarChart3, Calculator, MapPin, TrendingUp } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalYieldAnalysis(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Yield Calculation"
        description="Understand the key metrics for evaluating your rental investment."
        items={[
          {
            icon: Calculator,
            label: "Gross Mietrendite (Rental Yield)",
            detail:
              "Annual rent / purchase price x 100. A good gross yield in Germany is typically 3-6%, depending on location. Cities like Munich have lower yields (2-3%) while eastern German cities can exceed 6%.",
          },
          {
            icon: BarChart3,
            label: "Net Yield After Costs",
            detail:
              "Deduct non-recoverable costs: Hausgeld, maintenance reserves, vacancy allowance (typically 2-5%), property management fees, and insurance. Net yield is usually 1-2% lower than gross.",
          },
          {
            icon: TrendingUp,
            label: "ROI Calculator",
            detail:
              "Use HeimPath's built-in ROI calculator to model your returns with different scenarios for rent increases, vacancy rates, and appreciation.",
          },
        ]}
        tip="Don't chase the highest yield alone — factor in tenant quality, vacancy risk, and capital appreciation potential. A slightly lower yield in a strong market often outperforms over time."
      />
      <GuidanceCard
        title="Market Comparison"
        description="Benchmark your rental expectations against the local market."
        items={[
          {
            icon: MapPin,
            label: "Mietspiegel (Rent Index)",
            detail:
              "The local Mietspiegel shows average rents by area, building age, and quality. Your asking rent should align with or stay below these figures to comply with rent control regulations.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalYieldAnalysis }
