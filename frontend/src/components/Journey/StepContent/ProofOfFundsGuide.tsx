/**
 * Proof of Funds Step Content
 * Guidance on preparing financial evidence for sellers and lenders
 */

import { BadgeCheck, Banknote, FileSearch, PiggyBank } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function ProofOfFundsGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Equity and Liquid Assets"
        description="German lenders typically require 20–30% equity plus enough to cover all closing costs."
        items={[
          {
            icon: PiggyBank,
            label: "Eigenkapital (Equity)",
            detail:
              "Show recent bank statements (last 3 months) demonstrating you hold the required equity. Savings accounts, securities, and existing property equity all count.",
          },
          {
            icon: Banknote,
            label: "Closing Cost Reserve",
            detail:
              "Keep an additional 8–12% of the purchase price liquid for Grunderwerbsteuer, notary, and Makler fees. This must come from your own funds — it cannot be financed.",
          },
        ]}
        tip="Some sellers request a Finanzierungsbestätigung (financing confirmation letter) from your bank before accepting an offer. Request this early."
      />
      <GuidanceCard
        title="Credit and Income Documents"
        description="Lenders and sellers need confidence in your financial standing and repayment ability."
        items={[
          {
            icon: BadgeCheck,
            label: "Schufa Credit Report",
            detail:
              "Obtain a free annual Schufa report at meineschufa.de. Address any errors before applying for a mortgage — banks will check this automatically.",
          },
          {
            icon: FileSearch,
            label: "Proof of Income",
            detail:
              "Prepare the last 3 Gehaltsabrechnungen (payslips), your most recent Steuerbescheid (tax assessment), and employment contract. Self-employed buyers need 2 years of Gewinn-und-Verlustrechnung.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProofOfFundsGuide }
