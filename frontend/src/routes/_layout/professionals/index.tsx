/**
 * Professionals List Page
 * Browse the verified professional directory
 */

import { createFileRoute } from "@tanstack/react-router"
import { UserCheck } from "lucide-react"
import { ProfessionalList } from "@/components/Professionals"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/professionals/")({
  component: ProfessionalsPage,
  head: () => ({
    meta: [{ title: "Professional Directory - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Professionals listing page. */
function ProfessionalsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          Professional Directory
        </h1>
        <p className="text-muted-foreground">
          Find verified bilingual professionals to help with your property
          purchase in Germany
        </p>
      </div>

      {/* List */}
      <ProfessionalList />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default ProfessionalsPage
