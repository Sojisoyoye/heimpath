import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import DashboardPage from "@/components/Dashboard/DashboardPage"
import { OnboardingWizard } from "@/components/Onboarding"
import { useDashboardOverview } from "@/hooks/queries/useDashboardQueries"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - HeimPath",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const { data, isLoading } = useDashboardOverview()

  const showWizard = currentUser?.onboarding_completed === false
  const [wizardDismissed, setWizardDismissed] = useState(false)

  const userName = currentUser?.full_name || currentUser?.email || "there"

  return (
    <>
      {showWizard && !wizardDismissed && (
        <OnboardingWizard open onComplete={() => setWizardDismissed(true)} />
      )}
      <DashboardPage data={data} isLoading={isLoading} userName={userName} />
    </>
  )
}
