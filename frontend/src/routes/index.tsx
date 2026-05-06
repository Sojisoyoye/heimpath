import { createFileRoute } from "@tanstack/react-router"

import { seoMeta } from "@/common/seo"
import LandingPage from "@/components/Landing/LandingPage"

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: seoMeta({
      title: "HeimPath - Navigate German Real Estate with Confidence",
      path: "/",
    }),
  }),
})
