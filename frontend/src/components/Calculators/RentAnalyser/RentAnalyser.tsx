/**
 * Rent Analyser
 * Unified tool combining market rent estimate (Mietspiegel) and
 * Mietpreisbremse compliance check into one progressive-disclosure flow.
 * Shared postcode, size, and building-year state pre-populates Section 2.
 */

import { MapPin, Scale } from "lucide-react"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { MarketRentSection } from "./MarketRentSection"
import { RentCeilingSection } from "./RentCeilingSection"

// ***************************************************************************
//                              Main Component
// ***************************************************************************

function RentAnalyser() {
  const [postcode, setPostcode] = useState("")
  const [sizeSqm, setSizeSqm] = useState("")
  const [buildingYear, setBuildingYear] = useState("")

  return (
    <div className="space-y-8">
      {/* Section 1 */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-primary" />
            1. Market Rent Estimate (Mietspiegel)
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Estimate market rents for any German postcode. City-level data for 9
            major cities; state averages for all other postcodes.
          </p>
        </div>
        <MarketRentSection
          postcode={postcode}
          onPostcodeChange={setPostcode}
          sizeSqm={sizeSqm}
          onSizeSqmChange={setSizeSqm}
          buildingYear={buildingYear}
          onBuildingYearChange={setBuildingYear}
        />
      </section>

      <Separator />

      {/* Section 2 */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Scale className="h-5 w-5 text-primary" />
            2. Rent Ceiling Check (Mietpreisbremse)
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Check whether a rent exceeds the legal cap under §556d BGB. Postcode
            and size are pre-filled from Section 1.
          </p>
        </div>
        <RentCeilingSection
          postcode={postcode}
          onPostcodeChange={setPostcode}
          sizeSqm={sizeSqm}
          onSizeSqmChange={setSizeSqm}
          buildingYear={buildingYear}
          onBuildingYearChange={setBuildingYear}
        />
      </section>
    </div>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export { RentAnalyser }
