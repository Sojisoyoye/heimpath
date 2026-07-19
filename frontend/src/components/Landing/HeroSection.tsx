import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParallax } from "@/hooks/useParallax"

/******************************************************************************
                              Constants
******************************************************************************/

const HERO_PILLS = [
  { label: "Property Journey", dot: "bg-blue-500" },
  { label: "Cost & Mortgage Calculators", dot: "bg-primary" },
  { label: "Legal Guidance", dot: "bg-orange-500" },
  { label: "Document Translation", dot: "bg-green-500" },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Hero section with headline, CTAs, and feature pills. */
function HeroSection() {
  const blobTopRef = useParallax(0.3)
  const blobBottomRef = useParallax(0.5)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-100/50 to-primary/10 dark:from-blue-950/30 dark:to-primary/15">
      {/* Gradient accent bar — echoes CTA gradient for visual bookend */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-primary"
      />

      {/* Decorative blur blobs — parallax on md+ screens */}
      <div
        ref={blobTopRef}
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl will-change-transform"
      />
      <div
        ref={blobBottomRef}
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl will-change-transform"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center md:items-start md:px-6 md:py-24 md:text-left">
        <Badge
          variant="outline"
          className="mb-6 animate-in fade-in slide-in-from-bottom-3 border-primary/35 bg-primary/10 font-mono text-[11px] uppercase tracking-wide text-primary duration-500 fill-mode-backwards motion-reduce:animate-none"
        >
          Stop Renting. Start Building German Equity.
        </Badge>

        <h1 className="max-w-3xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-4xl font-bold tracking-tight text-balance delay-100 duration-500 motion-reduce:animate-none md:text-5xl lg:text-6xl">
          Own German Property.{" "}
          <span className="bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">
            Build Real Wealth.
          </span>
        </h1>

        <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-200 duration-500 motion-reduce:animate-none">
          Join investors who've tracked €2.3M in European property deals — start
          in 2 minutes.
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

        <div className="mt-12 flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex-wrap items-center justify-center gap-3 delay-300 duration-700 motion-reduce:animate-none md:justify-start">
          {HERO_PILLS.map((pill) => (
            <span
              key={pill.label}
              className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 font-mono text-xs text-muted-foreground"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`}
              />
              {pill.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HeroSection }
