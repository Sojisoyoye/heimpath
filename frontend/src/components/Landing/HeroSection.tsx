import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { HeroPhoto } from "./HeroPhoto"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Hero section with headline, CTAs, and property illustration. */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      {/* Decorative blur blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-400/10 blur-3xl" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-20 md:flex-row md:px-6 md:py-28 lg:py-32">
        {/* Text content */}
        <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
          <Badge
            variant="secondary"
            className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-backwards motion-reduce:animate-none"
          >
            Your German Property Journey Starts Here
          </Badge>

          <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-4xl font-bold tracking-tight delay-100 duration-500 motion-reduce:animate-none md:text-5xl lg:text-6xl">
            Navigate German Real Estate{" "}
            <span className="text-blue-600">with Confidence</span>
          </h1>

          <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-200 duration-500 motion-reduce:animate-none">
            HeimPath guides foreign investors and immigrants through every step
            of buying property in Germany — from research to closing, in a
            language you understand.
          </p>

          <div className="mt-8 flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex-wrap gap-4 delay-300 duration-500 motion-reduce:animate-none">
            <Button size="lg" asChild>
              <Link to="/signup">Start Your Journey</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Learn More</a>
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
