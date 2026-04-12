import { Link } from "@tanstack/react-router"
import { ArrowRight, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

/******************************************************************************
                              Components
******************************************************************************/

/** Property evaluation CTA banner for the landing page. */
function PropertyEvaluationCtaSection() {
  const loggedIn = isLoggedIn()

  return (
    <section className="bg-gradient-to-r from-teal-50 to-blue-50 py-16 dark:from-teal-950/20 dark:to-blue-950/20 md:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 md:flex-row md:px-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
          <TrendingUp className="h-10 w-10" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Evaluate a Property Instantly
          </h2>
          <p className="mt-2 text-muted-foreground">
            Found a listing? Estimate your monthly costs, cashflow, and return
            on investment before you commit. Our Property Evaluation Calculator
            gives you a clear picture in minutes.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3">
          {loggedIn ? (
            <Button size="lg" asChild>
              <Link to="/calculators" search={{ tab: "property-evaluation" }}>
                Evaluate Property
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link
                  to="/signup"
                  search={{ redirect: "/calculators?tab=property-evaluation" }}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  to="/login"
                  search={{ redirect: "/calculators?tab=property-evaluation" }}
                >
                  Sign In to Evaluate
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyEvaluationCtaSection }
