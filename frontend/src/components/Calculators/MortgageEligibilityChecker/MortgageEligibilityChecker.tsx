/**
 * Mortgage Eligibility Checker
 * Unified tool combining lender access overview (quick profile) and
 * numeric financing assessment (detailed).
 */

import { Landmark, ShieldCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { DetailedAssessment } from "./DetailedAssessment"
import { QuickProfile } from "./QuickProfile"

// ***************************************************************************
//                              Main Component
// ***************************************************************************

function MortgageEligibilityChecker() {
  return (
    <div className="space-y-8">
      {/* Section 1 */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            1. Lender Access — Quick Profile
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Answer 3 questions to see which lender types are likely to finance
            your purchase — and on what terms.
          </p>
        </div>
        <QuickProfile />
      </section>

      <Separator />

      {/* Section 2 */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Landmark className="h-5 w-5 text-primary" />
            2. Financial Assessment
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enter your financial details to receive a numeric eligibility score,
            max loan estimate, and personalised document checklist.
          </p>
        </div>
        <DetailedAssessment />
      </section>
    </div>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export { MortgageEligibilityChecker }
