import { Link } from "@tanstack/react-router"

import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { NavUserMenu } from "@/components/Common/NavUserMenu"
import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Sticky header for the landing page. */
function LandingHeader() {
  const authenticated = isLoggedIn()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Logo variant="full" asLink={false} />

        <div className="flex items-center gap-2">
          <Appearance />
          {authenticated ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <NavUserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LandingHeader }
