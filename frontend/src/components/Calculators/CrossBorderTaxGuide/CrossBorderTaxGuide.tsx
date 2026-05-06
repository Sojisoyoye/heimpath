/**
 * Cross-Border Tax Guide
 * Main orchestrator wiring country selector, tax profile, comparison, and educational sections
 */

import { useState } from "react"
import { cn } from "@/common/utils"
import { CountrySelector } from "./CountrySelector"
import { CountryTaxProfile } from "./CountryTaxProfile"
import { COUNTRY_TAX_DATA } from "./countryTaxData"
import { ResidentComparison } from "./ResidentComparison"
import { TaxEducationalSection } from "./TaxEducationalSection"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

function CrossBorderTaxGuide(props: Readonly<IProps>) {
  const { className } = props
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const selectedCountry = selectedCode
    ? (COUNTRY_TAX_DATA.find((c) => c.code === selectedCode) ?? null)
    : null

  return (
    <div className={cn("space-y-6", className)}>
      <CountrySelector
        selectedCountry={selectedCode}
        onSelect={setSelectedCode}
      />

      {selectedCountry && <CountryTaxProfile country={selectedCountry} />}

      <ResidentComparison />

      <TaxEducationalSection />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CrossBorderTaxGuide }
