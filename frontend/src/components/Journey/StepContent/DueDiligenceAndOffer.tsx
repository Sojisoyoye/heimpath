/**
 * Due Diligence and Offer Step Content
 * Document review zone + guidance on checks before submitting an offer
 */

import { FileSearch, Scale, ShieldCheck } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"
import { StepDocumentReview } from "./StepDocumentReview"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function DueDiligenceAndOffer(props: Readonly<IProps>) {
  const { step } = props

  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Key Checks Before Making an Offer"
        description="Carry out these checks on any property you are seriously considering."
        items={[
          {
            icon: FileSearch,
            label: "Grundbuch Extract",
            detail:
              "Request a current Grundbuchauszug from the seller or via your notary. Check for Grundschulden (land charges), easements (Dienstbarkeiten), or third-party rights that could affect your ownership.",
          },
          {
            icon: Scale,
            label: "Teilungserklärung for Condos (ETW)",
            detail:
              "For apartments, review the Teilungserklärung and Gemeinschaftsordnung. These set the rules for shared costs, parking, and structural changes. Check the Instandhaltungsrücklage balance.",
          },
          {
            icon: ShieldCheck,
            label: "Building Permits and Alterations",
            detail:
              "Ask the seller for all Baugenehmigungen. Unpermitted alterations (Schwarzbauten) transfer liability to the buyer. Request a Baulastenauskunft from the local building authority.",
          },
        ]}
        tip="Upload the Grundbuch extract, Exposé, and any floor plans below to get an AI-assisted translation and risk summary."
      />
      <StepDocumentReview stepId={step.id} />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DueDiligenceAndOffer }
