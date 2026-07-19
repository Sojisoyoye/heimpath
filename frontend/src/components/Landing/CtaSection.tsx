import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Call-to-action banner section. */
function CtaSection() {
  const loggedIn = isLoggedIn()

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-primary py-20 md:py-28">
      {/* Geometric dot grid overlay — hidden on mobile */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        <defs>
          <pattern
            id="cta-dot-grid"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="white" fillOpacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-dot-grid)" />
      </svg>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-6">
        <AnimateIn>
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-extrabold tracking-tight text-balance text-white md:text-5xl">
              {loggedIn
                ? "Continue Your German Property Journey"
                : "Ready to Start Your German Property Journey?"}
            </h2>
            <p className="mt-4 max-w-lg text-lg text-blue-100 md:mx-0">
              {loggedIn
                ? "Pick up where you left off and take the next step toward owning property in Germany."
                : "Join thousands of international buyers who navigate German real estate with confidence using HeimPath."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 md:items-start">
              {loggedIn ? (
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base"
                  asChild
                >
                  <Link to="/dashboard">Continue Your Journey</Link>
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-base"
                    asChild
                  >
                    <Link to="/signup">Create Free Account</Link>
                  </Button>
                  <p className="text-sm text-blue-200">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-white underline underline-offset-4 hover:text-blue-100"
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </AnimateIn>

        <AnimateIn delayMs={100}>
          <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/20 shadow-xl md:ml-auto">
            <img
              src="/images/cta-investor.jpg"
              alt="A confident HeimPath user who successfully bought property in Germany"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CtaSection }
