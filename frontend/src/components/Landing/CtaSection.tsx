import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Call-to-action banner section — headline + CTA on the
 * left, a large lifestyle photo with a supporting detail row on the right. */
function CtaSection() {
  const loggedIn = isLoggedIn()

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.4fr] md:items-center md:gap-12">
          <AnimateIn>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
              / Get Started
            </span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-balance md:text-5xl">
              {loggedIn
                ? "Continue Your German Property Journey."
                : "Own More Than Just a Property."}
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              {loggedIn
                ? "Pick up where you left off and take the next step toward owning property in Germany."
                : "Join thousands of international buyers who navigate German real estate with confidence using HeimPath."}
            </p>
            <div className="mt-8 flex flex-col items-start gap-4">
              {loggedIn ? (
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/dashboard">
                    Continue Your Journey
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="gap-2" asChild>
                    <Link to="/signup">
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </AnimateIn>

          <AnimateIn delayMs={100}>
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/images/cta-living-room.jpg"
                alt="A bright, modern living room — the kind of home HeimPath helps you own"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="mt-4 flex items-center gap-4 rounded-xl border bg-card p-4">
              <img
                src="/images/cta-living-room-thumb.jpg"
                alt=""
                aria-hidden="true"
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
              <p className="flex-1 text-sm text-muted-foreground">
                From your first search to closing day, HeimPath supports every
                step — calculators, legal guidance, and document translation
                included.
              </p>
              <a
                href="#features"
                className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
              >
                See How It Works
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CtaSection }
