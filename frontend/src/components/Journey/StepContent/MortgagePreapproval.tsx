/**
 * Mortgage Preapproval Step Content
 * Guidance for getting a mortgage pre-approval in Germany
 */

import { BadgeCheck, Building2, FileText, Scale, Wallet } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"
import { PartnerReferralBanner } from "./PartnerReferralBanner"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgagePreapproval(_props: Readonly<IProps>) {
  return (
    <div className="space-y-3">
      <GuidanceCard
        title="Get Mortgage Pre-Approval"
        description="A Finanzierungszusage (pre-approval) from a bank shows sellers you are a serious buyer and lets you move quickly when you find the right property."
        items={[
          {
            icon: FileText,
            label: "Prepare Your Documents",
            detail:
              "Banks require: last 3 salary slips, 2 years of tax returns, 3 months of bank statements, employment contract, passport, and proof of equity (savings account statement).",
          },
          {
            icon: Scale,
            label: "Understand Key Loan Terms",
            detail:
              "Sollzins is the nominal interest rate; Effektivzins (APRC) includes all fees and is the fair comparison metric. Tilgungsrate (repayment rate) — aim for at least 2% initially.",
          },
          {
            icon: Building2,
            label: "Approach Multiple Lenders",
            detail:
              "Compare at least 3–4 offers: local Sparkasse, Volksbank, and online brokers. Submit all applications within 14 days — SCHUFA treats clustered queries as a single inquiry.",
          },
          {
            icon: BadgeCheck,
            label: "Sondertilgungsrecht (Overpayment Right)",
            detail:
              "Negotiate the right to repay 5–10% of the original loan annually without penalty. This significantly reduces your total interest cost over the loan term.",
          },
          {
            icon: Wallet,
            label: "Non-Citizen Considerations",
            detail:
              "Without a German employment history, you may need a larger deposit (30–40%) and be required to provide an Aufenthaltstitel (residence permit). Some online brokers specialise in expat cases.",
          },
        ]}
        tip="Pre-approval is not a binding commitment — you can still negotiate with multiple banks simultaneously. Use the Mortgage Calculator to model different repayment scenarios first."
        ctaLabel="Open Mortgage Calculator"
        ctaHref="/calculators"
        ctaSearch={{ tab: "mortgage" }}
      />

      <PartnerReferralBanner
        partnerName="Hypofriend"
        description="Hypofriend specialises in mortgage pre-approval for expats and foreign buyers in Germany — available in English with dedicated advisors."
        ctaLabel="Visit Hypofriend"
        href="https://www.hypofriend.de"
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgagePreapproval }
