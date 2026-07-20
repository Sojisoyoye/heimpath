import { lazy, Suspense } from "react"
import { AdvantagesSection } from "./AdvantagesSection"
import { ComparisonTable } from "./ComparisonTable"
import { CtaSection } from "./CtaSection"
import { FeaturesSection } from "./FeaturesSection"
import { FreeLibrarySection } from "./FreeLibrarySection"
import { FreeToolsSection } from "./FreeToolsSection"
import { HeroSection } from "./HeroSection"
import { HowItWorksSection } from "./HowItWorksSection"
import { LandingFooter } from "./LandingFooter"
import { LandingHeader } from "./LandingHeader"
import { PropertyEvaluationCtaSection } from "./PropertyEvaluationCtaSection"
import { TestimonialsSection } from "./TestimonialsSection"

// Lazy-loaded so jsPDF and the calculator's auth-aware hooks are excluded from
// the homepage's SSG/SSR render (Suspense renders the fallback during
// renderToString, avoiding isLoggedIn() hydration mismatches for logged-in users).
const HomepageCalculatorSection = lazy(
  () => import("./HomepageCalculatorSection"),
)

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Full landing page composed of all sections. */
function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <PropertyEvaluationCtaSection />
        <Suspense
          fallback={
            <div className="border-y bg-muted/30 py-16 md:py-24 min-h-[640px]" />
          }
        >
          <HomepageCalculatorSection />
        </Suspense>
        <FeaturesSection />
        <HowItWorksSection />
        <FreeLibrarySection />
        <FreeToolsSection />
        <ComparisonTable />
        <TestimonialsSection />
        <AdvantagesSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default LandingPage
