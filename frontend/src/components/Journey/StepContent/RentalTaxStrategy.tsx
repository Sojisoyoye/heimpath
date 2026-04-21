/**
 * Rental Tax Strategy Step Content
 * Guidance on rental income taxation, deductions, and depreciation in Germany
 */

import { Calculator, FileText, PiggyBank, Receipt } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalTaxStrategy(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Rental Income Tax (Anlage V)"
        description="Rental income in Germany must be reported on Anlage V of your annual tax return."
        items={[
          {
            icon: FileText,
            label: "Anlage V Filing",
            detail:
              "Report all rental income and deductible expenses on Anlage V (Einkuenfte aus Vermietung und Verpachtung). The net rental income is taxed at your personal income tax rate.",
          },
          {
            icon: Receipt,
            label: "Deductible Expenses",
            detail:
              "Mortgage interest, Hausverwaltung fees, repairs, insurance premiums, travel to the property, legal fees, and advertising costs for finding tenants are all deductible.",
          },
          {
            icon: Calculator,
            label: "AfA (Depreciation)",
            detail:
              "You can depreciate the building value (not land) at 2% per year over 50 years (linear depreciation). For buildings built after 2023, the rate is 3% over ~33 years. This significantly reduces your taxable income.",
          },
        ]}
        tip="Consider hiring a Steuerberater (tax advisor) experienced in rental income. Their fees are tax-deductible, and they often save more than they cost through optimized deductions."
      />
      <GuidanceCard
        title="Tax Optimization"
        description="Legal strategies to reduce your rental tax burden."
        items={[
          {
            icon: PiggyBank,
            label: "Loss Offset (Verlustverrechnung)",
            detail:
              "Rental losses (e.g. from high depreciation + mortgage interest in early years) can offset your other income, reducing your overall tax bill. This is a key advantage of property investment in Germany.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalTaxStrategy }
