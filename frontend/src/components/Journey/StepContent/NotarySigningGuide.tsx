/**
 * Notary Signing Step Content
 * Guidance on what to expect at the Notartermin (notary appointment)
 */

import {
  BookMarked,
  MessageCircleQuestion,
  Shield,
  UserCheck,
} from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function NotarySigningGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="At the Notartermin"
        description="The signing appointment is a formal legal act — being well prepared prevents delays."
        items={[
          {
            icon: UserCheck,
            label: "Bring Valid Photo ID",
            detail:
              "Every party named in the contract must appear in person with a valid passport or national ID, or send an authorised representative with a notarised power of attorney (Vollmacht).",
          },
          {
            icon: BookMarked,
            label: "The Notar Reads the Contract Aloud",
            detail:
              "The notary is legally required to read the entire Kaufvertrag aloud. This takes 30–90 minutes. Bring an interpreter if you are not fluent in German, or ask the notary to arrange one in advance.",
          },
          {
            icon: MessageCircleQuestion,
            label: "Ask All Questions Before Signing",
            detail:
              "Once signed, the contract is binding. The notary can clarify the meaning of clauses but cannot give legal advice. Raise any unresolved points before the appointment.",
          },
        ]}
        tip="After signing, the notary immediately applies for an Auflassungsvormerkung (priority notice) in the Grundbuch. This protects your purchase while the full transfer is processed."
      />
      <GuidanceCard
        title="After Signing"
        description="Several actions happen automatically after the notary appointment."
        items={[
          {
            icon: Shield,
            label: "Auflassungsvormerkung Entered",
            detail:
              "The priority notice blocks the seller from selling to anyone else or placing new liens on the property. It is replaced by full ownership entry once all conditions are met.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NotarySigningGuide }
