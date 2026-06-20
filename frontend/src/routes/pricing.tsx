import { createFileRoute } from "@tanstack/react-router"

import { seoMeta } from "@/common/seo"
import { PricingPage } from "@/components/Landing/PricingPage"

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    ...seoMeta({
      title:
        "Pricing — HeimPath | English Guide for Buying Property in Germany",
      path: "/pricing",
    }),
  }),
})
