/**
 * Educational Section
 * Collapsible card explaining private vs GmbH tax rules in Germany
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

function EducationalSection() {
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
              Understanding GmbH vs. Private Ownership
            </CardTitle>
            <CardDescription>
              Key tax differences for property investors in Germany
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
          {/* Private Ownership */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">
              Private Ownership (Privatvermögen)
            </h4>
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2">
              <p>
                <strong>Rental income</strong> is taxed at your personal
                marginal rate (up to 45%) plus 5.5% solidarity surcharge.
                Depreciation (AfA) and mortgage interest are deductible.
              </p>
              <p>
                <strong>Capital gains</strong> are tax-free after a 10-year
                holding period (Spekulationsfrist). If sold before 10 years,
                gains are taxed at your personal marginal rate.
              </p>
              <p className="text-muted-foreground">
                Best for: Lower tax brackets, long-term hold (10+ years), single
                property investors.
              </p>
            </div>
          </div>

          {/* GmbH Ownership */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400">
              GmbH Holding (Vermögensverwaltende GmbH)
            </h4>
            <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
              <p>
                <strong>Rental income</strong> is taxed at the corporate rate:
                15% Körperschaftsteuer + 5.5% Soli + ~14% Gewerbesteuer = ~29.8%
                total. Annual accounting costs apply (~4,000/yr).
              </p>
              <p>
                <strong>Capital gains</strong> benefit from §8b KStG: only 5% of
                gains are taxable, resulting in an effective rate of ~1.5%. No
                10-year waiting period.
              </p>
              <p>
                <strong>Distributions</strong> to shareholders are subject to
                26.375% Kapitalertragsteuer (25% + 5.5% Soli).
              </p>
              <p className="text-muted-foreground">
                Best for: Higher tax brackets (42%+), multiple properties,
                investors who reinvest within the GmbH.
              </p>
            </div>
          </div>

          {/* Key Decision Factors */}
          <div className="space-y-2">
            <h4 className="font-semibold">Key Decision Factors</h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                The higher your personal tax rate, the more a GmbH saves on
                rental income taxation
              </li>
              <li>
                Private ownership wins if you hold 10+ years (tax-free capital
                gains) and have a low tax rate
              </li>
              <li>
                GmbH has fixed overhead costs (setup ~3,500, accounting
                ~4,000/yr) that must be offset by tax savings
              </li>
              <li>
                Distributions from the GmbH incur 26.375% tax — reinvesting
                within the GmbH defers this
              </li>
              <li>
                Consider consulting a Steuerberater (tax advisor) for your
                specific situation
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Disclaimer:</strong> This calculator provides estimates
            based on simplified German tax rules. Actual tax obligations depend
            on individual circumstances. Church tax, municipal variations, and
            special deductions are not included. Always consult a qualified
            German tax advisor before making investment decisions.
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { EducationalSection }
