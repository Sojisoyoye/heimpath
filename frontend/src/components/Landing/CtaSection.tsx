import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Call-to-action banner section. */
function CtaSection() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Ready to Start Your German Property Journey?
        </h2>
        <p className="mt-4 text-lg text-blue-100">
          Join thousands of international buyers who navigate German real estate
          with confidence using HeimPath.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button size="lg" variant="secondary" className="text-base" asChild>
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
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CtaSection }
