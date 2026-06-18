import { Link } from "@tanstack/react-router"
import { HiddenCostsCalculator } from "@/components/Calculators/HiddenCostsCalculator"
import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Components
******************************************************************************/

/** Embeds the property cost calculator on the landing page — no sign-up required. */
function HomepageCalculatorSection() {
  return (
    <section className="border-y bg-muted/30 py-16 md:py-24" id="calculator">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <div className="mb-10 text-center md:mb-14">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Free · No sign-up required
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Calculate Your True Purchase Cost
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Grunderwerbsteuer, notary, land registry, and agent commission —
              see every cost before you make an offer.
            </p>
          </div>
        </AnimateIn>

        <HiddenCostsCalculator />

        <AnimateIn>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link
              to="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create a free account
            </Link>{" "}
            to save results, compare properties, and unlock your guided buying
            journey.
          </p>
        </AnimateIn>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HomepageCalculatorSection }
