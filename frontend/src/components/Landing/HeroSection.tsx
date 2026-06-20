import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParallax } from "@/hooks/useParallax"

import { HeroPhoto } from "./HeroPhoto"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Hero section with headline, CTAs, and property illustration. */
function HeroSection() {
  const blobTopRef = useParallax(0.3)
  const blobBottomRef = useParallax(0.5)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-950/30 dark:to-purple-950/30">
      {/* Gradient accent bar — echoes CTA gradient for visual bookend */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"
      />

      {/* Decorative blur blobs — parallax on md+ screens */}
      <div
        ref={blobTopRef}
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl will-change-transform"
      />
      <div
        ref={blobBottomRef}
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-400/15 blur-3xl will-change-transform"
      />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-20 md:flex-row md:px-6 md:py-28 lg:py-32">
        {/* Text content */}
        <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
          <Badge
            variant="secondary"
            className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-backwards motion-reduce:animate-none"
          >
            Stop Renting. Start Building German Equity.
          </Badge>

          <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-4xl font-bold tracking-tight delay-100 duration-500 motion-reduce:animate-none md:text-5xl lg:text-6xl">
            Own German Property.{" "}
            <span className="text-blue-600">Build Real Wealth.</span>
          </h1>

          <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-200 duration-500 motion-reduce:animate-none">
            Join investors who've tracked €2.3M in European property deals —
            start in 2 minutes.
          </p>

          <div className="mt-8 flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex-col items-center gap-4 delay-300 duration-500 motion-reduce:animate-none sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-1.5 sm:items-start">
              <Button size="lg" asChild>
                <Link to="/signup">Start My Journey</Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                Free · No credit card · Takes 2 minutes
              </span>
            </div>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">See How It Works</a>
            </Button>
          </div>
        </div>

        {/* Property photo */}
        <div className="hidden flex-1 animate-in fade-in zoom-in-95 fill-mode-backwards delay-300 duration-700 motion-reduce:animate-none md:block md:max-w-xs lg:max-w-sm">
          <HeroPhoto />
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HeroSection }
