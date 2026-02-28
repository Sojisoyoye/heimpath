import { AdvantagesSection } from "./AdvantagesSection"
import { CtaSection } from "./CtaSection"
import { FeaturesSection } from "./FeaturesSection"
import { HeroSection } from "./HeroSection"
import { HowItWorksSection } from "./HowItWorksSection"
import { LandingFooter } from "./LandingFooter"
import { LandingHeader } from "./LandingHeader"
import { PropertyEvaluationCtaSection } from "./PropertyEvaluationCtaSection"

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
        <FeaturesSection />
        <PropertyEvaluationCtaSection />
        <HowItWorksSection />
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
