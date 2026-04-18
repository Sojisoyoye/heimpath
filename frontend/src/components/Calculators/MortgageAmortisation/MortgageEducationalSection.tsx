/**
 * Mortgage Educational Section
 * Collapsible card explaining German mortgage terminology
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

function MortgageEducationalSection() {
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
              Understanding German Mortgages
            </CardTitle>
            <CardDescription>
              Key terms and concepts for Baufinanzierung
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
          {/* Sollzins vs Effektivzins */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">
              Sollzins vs. Effektivzins
            </h4>
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2">
              <p>
                <strong>Sollzins</strong> (nominal interest rate) is the pure
                interest your bank charges on the loan. This is what our
                calculator uses.
              </p>
              <p>
                <strong>Effektivzins</strong> (effective annual rate) includes
                all fees and costs, making it higher than Sollzins. By law,
                banks must disclose both. Use Effektivzins to compare offers.
              </p>
            </div>
          </div>

          {/* Anfangstilgung */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400">
              Anfangstilgung (Initial Repayment Rate)
            </h4>
            <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
              <p>
                The starting annual repayment percentage. In a German annuity
                mortgage, your monthly payment stays constant, but the
                interest/principal split changes over time — as the balance
                decreases, more of your payment goes toward principal.
              </p>
              <p>
                A 1% Anfangstilgung means very slow payoff (40+ years). Most
                advisors recommend at least 2-3% for a reasonable term.
              </p>
            </div>
          </div>

          {/* Zinsbindung */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-700 dark:text-green-400">
              Zinsbindung & Anschlussfinanzierung
            </h4>
            <div className="rounded-lg bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
              <p>
                <strong>Zinsbindung</strong> is the fixed-rate period —
                typically 5, 10, 15, or 20 years. During this period, your
                interest rate cannot change regardless of market conditions.
              </p>
              <p>
                When the Zinsbindung expires, you need{" "}
                <strong>Anschlussfinanzierung</strong> (follow-up financing) for
                the remaining balance. This can be a new deal with your current
                bank (Prolongation) or a switch to a different lender
                (Umschuldung).
              </p>
              <p className="text-muted-foreground">
                Tip: After 10 years, borrowers have the legal right to terminate
                the loan (§489 BGB) with 6 months' notice, regardless of the
                Zinsbindung length.
              </p>
            </div>
          </div>

          {/* Sondertilgung */}
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-700 dark:text-orange-400">
              Sondertilgung (Special Repayment)
            </h4>
            <div className="rounded-lg bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-2">
              <p>
                Most German mortgage contracts allow annual special repayments
                of 5-10% of the initial loan amount without penalty. This is a
                powerful way to reduce total interest and shorten the loan term.
              </p>
              <p className="text-muted-foreground">
                Negotiate Sondertilgung rights when signing your contract — they
                may slightly increase your interest rate but can save
                significantly over the full term.
              </p>
            </div>
          </div>

          {/* Beleihungsauslauf (LTV) */}
          <div className="space-y-2">
            <h4 className="font-semibold">
              Beleihungsauslauf (Loan-to-Value Ratio)
            </h4>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p>
                German banks calculate LTV based on the{" "}
                <strong>Beleihungswert</strong> (lending value), which is
                typically 10-20% below market value. An LTV below 60% usually
                secures the best interest rates.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Below 60% — best rates, easiest approval</li>
                <li>60-80% — standard rates, normal conditions</li>
                <li>Above 80% — higher rates, stricter requirements</li>
                <li>100%+ financing — rare, requires excellent income</li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Disclaimer:</strong> This calculator provides estimates
            based on simplified German mortgage formulas. Actual mortgage offers
            depend on your credit profile, employment status, property type, and
            current market conditions. Effektivzins, bank fees, and insurance
            costs are not included. Always compare multiple bank offers and
            consult a Baufinanzierungsberater (mortgage advisor) before signing.
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageEducationalSection }
