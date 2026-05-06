import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

/******************************************************************************
                              Components
******************************************************************************/

/** Sign-up CTA section shown on public tools pages. Hidden when logged in. */
function ToolsCta() {
  if (isLoggedIn()) return null

  return (
    <section className="border-t bg-muted/30 py-12">
      <div className="mx-auto max-w-2xl px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Get the full HeimPath experience
        </h2>
        <p className="text-muted-foreground">
          Create a free account to save your calculations, get shareable links,
          and access our guided property buying journey.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/signup">Sign Up Free</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link to="/login">Log In</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Inline sign-up CTA shown inside calculator results when not logged in. */
function SaveSignUpCta() {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
      <p className="text-sm font-medium">Save & share your calculations</p>
      <p className="text-xs text-muted-foreground">
        Create a free account to save results and get shareable links.
      </p>
      <Button asChild size="sm">
        <Link to="/signup">Sign Up Free</Link>
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SaveSignUpCta, ToolsCta }
