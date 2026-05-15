/**
 * Notary and Contract Step Content
 * Guidance on reviewing the Kaufvertrag and working with the notary
 */

import { Clock, HelpCircle, UserCheck } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"
import { StepDocumentReview } from "./StepDocumentReview"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function NotaryAndContract(props: Readonly<IProps>) {
  const { step } = props

  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Reviewing the Kaufvertragsentwurf"
        description="You are legally entitled to review the draft purchase contract for at least 14 days before signing."
        items={[
          {
            icon: Clock,
            label: "14-Day Review Period",
            detail:
              "Request the Kaufvertragsentwurf from the notary as early as possible. The 14-day minimum is a legal right in Germany — no seller can pressure you to waive it.",
          },
          {
            icon: HelpCircle,
            label: "What to Check",
            detail:
              "Verify purchase price, payment schedule, Auflassungsvormerkung (priority notice) commitment, included fixtures (Inventar), and handover date. Have a bilingual lawyer review unfamiliar clauses.",
          },
          {
            icon: UserCheck,
            label: "The Notary's Role",
            detail:
              "The Notar is a neutral party — their fee is fixed by law and they are not your advocate. You can ask them to explain clauses, but engage your own lawyer for advice on negotiating terms.",
          },
        ]}
        tip="Upload the Kaufvertragsentwurf below to get a translated summary and flag any unusual clauses for review."
        ctaLabel="Find a Real Estate Lawyer"
        ctaHref="/professionals"
        ctaSearch={{ type: "lawyer" }}
      />
      <StepDocumentReview stepId={step.id} />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NotaryAndContract }
