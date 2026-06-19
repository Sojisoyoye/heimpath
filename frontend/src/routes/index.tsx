import { createFileRoute } from "@tanstack/react-router"

import { seoMeta } from "@/common/seo"
import LandingPage from "@/components/Landing/LandingPage"

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    ...seoMeta({
      title:
        "Buy Property in Germany as a Foreigner — HeimPath | English Guide & Calculators",
      path: "/",
    }),
  }),
})
