import { createFileRoute } from "@tanstack/react-router"
import DashboardPage from "@/components/Dashboard/DashboardPage"
import { useDashboardOverview } from "@/hooks/queries/useDashboardQueries"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
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

  const userName = currentUser?.full_name || currentUser?.email || "there"

  return <DashboardPage data={data} isLoading={isLoading} userName={userName} />
}
