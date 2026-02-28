import { createFileRoute, redirect } from "@tanstack/react-router"

import LandingPage from "@/components/Landing/LandingPage"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/")({
  component: LandingPage,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/dashboard" })
    }
  },
  head: () => ({
    meta: [{ title: "HeimPath - Navigate German Real Estate with Confidence" }],
  }),
})
