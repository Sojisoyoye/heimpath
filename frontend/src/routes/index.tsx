import { createFileRoute } from "@tanstack/react-router"

import LandingPage from "@/components/Landing/LandingPage"

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [{ title: "HeimPath - Navigate German Real Estate with Confidence" }],
  }),
})
