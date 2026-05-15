/**
 * Management and Finance Setup Step Content
 * Combines ongoing property management guidance with tax and finance setup
 */

import type { JourneyStep } from "@/models/journey"
import { OwnershipManagement } from "./OwnershipManagement"
import { OwnershipTaxFinance } from "./OwnershipTaxFinance"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

/** Renders property management guide followed by tax and finance setup. */
function ManagementAndFinanceSetup(props: Readonly<IProps>) {
  const { step } = props

  return (
    <div className="space-y-4">
      <OwnershipManagement step={step} />
      <OwnershipTaxFinance step={step} />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ManagementAndFinanceSetup }
