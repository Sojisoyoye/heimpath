/**
 * Registration and Insurance Step Content
 * Combines Grundbuch registration guidance with property insurance overview
 */

import type { JourneyStep } from "@/models/journey"
import { OwnershipInsurance } from "./OwnershipInsurance"
import { OwnershipRegistration } from "./OwnershipRegistration"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

/** Renders ownership registration steps followed by insurance guidance. */
function RegistrationAndInsurance(props: Readonly<IProps>) {
  const { step } = props

  return (
    <div className="space-y-4">
      <OwnershipRegistration step={step} />
      <OwnershipInsurance step={step} />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RegistrationAndInsurance }
