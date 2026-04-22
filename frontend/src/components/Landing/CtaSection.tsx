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
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20 md:py-28">
      <AnimateIn>
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            {loggedIn
              ? "Continue Your German Property Journey"
              : "Ready to Start Your German Property Journey?"}
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            {loggedIn
              ? "Pick up where you left off and take the next step toward owning property in Germany."
              : "Join thousands of international buyers who navigate German real estate with confidence using HeimPath."}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
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
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CtaSection }
