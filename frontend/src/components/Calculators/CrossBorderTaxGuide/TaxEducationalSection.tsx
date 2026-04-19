/**
 * Tax Educational Section
 * Collapsible card explaining key German tax concepts for foreign investors
 */

import { BookOpen, ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/******************************************************************************
                              Components
******************************************************************************/

function TaxEducationalSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen((p) => !p)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              German Tax Concepts for Foreign Investors
            </CardTitle>
            <CardDescription>
              Key terms and rules you need to understand
            </CardDescription>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-6 text-sm">
          {/* Beschränkte vs Unbeschränkte Steuerpflicht */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">
              Beschränkte vs. Unbeschränkte Steuerpflicht
            </h4>
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2">
              <p>
                <strong>Unbeschränkte Steuerpflicht</strong> (unlimited tax
                liability) applies to individuals who are resident in Germany or
                have their habitual abode here. They are taxed on worldwide
                income.
              </p>
              <p>
                <strong>Beschränkte Steuerpflicht</strong> (limited tax
                liability) applies to non-residents who earn income from German
                sources — such as rental income from German property. Only
                German-source income is taxed.
              </p>
              <p className="text-muted-foreground">
                Non-residents can apply for treatment as residents (§ 1 Abs. 3
                EStG) if at least 90% of their worldwide income is
                German-source, or non-German income is below ~11,604 EUR.
              </p>
            </div>
          </div>

          {/* AfA for Non-Residents */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400">
              AfA (Absetzung für Abnutzung) for Non-Residents
            </h4>
            <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
              <p>
                <strong>Depreciation</strong> at 2% per year (linear, on the
                building portion only) is available to non-residents just like
                residents. For buildings constructed after 2023, the rate is 3%.
              </p>
              <p>
                The land value (typically 20-30% of purchase price) cannot be
                depreciated. You can use the Bodenrichtwert or a purchase price
                allocation (Kaufpreisaufteilung) to determine the split.
              </p>
              <p className="text-muted-foreground">
                AfA is one of the most powerful tax tools for property investors
                — it creates paper losses that reduce your taxable rental
                income.
              </p>
            </div>
          </div>

          {/* Solidaritätszuschlag */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-700 dark:text-green-400">
              Solidaritätszuschlag (Solidarity Surcharge)
            </h4>
            <div className="rounded-lg bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
              <p>
                The <strong>Soli</strong> is a 5.5% surcharge on top of income
                tax. Since 2021, most residents are exempt (Freigrenze), but
                non-residents with beschränkte Steuerpflicht always pay it.
              </p>
              <p>
                This is why the effective flat rate for non-resident rental
                income is 15.825% (15% + 5.5% of 15%) rather than a plain 15%.
              </p>
              <p className="text-muted-foreground">
                For corporate structures (GmbH), the Soli is always applied: 15%
                KSt + 5.5% Soli = 15.825% before trade tax.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Disclaimer:</strong> This guide provides general information
            based on German tax law and DBA treaties. Tax laws change
            frequently. Individual circumstances, such as multiple income
            sources, special deductions, or corporate structures, can
            significantly affect your tax position. Always consult a qualified
            Steuerberater (tax advisor) with cross-border expertise before
            making investment decisions.
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TaxEducationalSection }
