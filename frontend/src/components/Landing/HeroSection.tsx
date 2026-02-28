import { Link } from "@tanstack/react-router"
import { Calculator, FileText, Home, Scale } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/******************************************************************************
                              Constants
******************************************************************************/

const HERO_ICONS = [
  {
    icon: Home,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    size: "h-16 w-16",
    iconSize: "h-8 w-8",
    position: "top-0 right-0",
  },
  {
    icon: Scale,
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    size: "h-14 w-14",
    iconSize: "h-7 w-7",
    position: "top-20 right-24",
  },
  {
    icon: Calculator,
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    size: "h-12 w-12",
    iconSize: "h-6 w-6",
    position: "bottom-8 right-4",
  },
  {
    icon: FileText,
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    size: "h-14 w-14",
    iconSize: "h-7 w-7",
    position: "bottom-0 right-20",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Hero section with headline, CTAs, and decorative icons. */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      {/* Decorative blur blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-400/10 blur-3xl" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-20 md:flex-row md:px-6 md:py-28 lg:py-32">
        {/* Text content */}
        <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
          <Badge variant="secondary" className="mb-6">
            Your German Property Journey Starts Here
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Navigate German Real Estate{" "}
            <span className="text-blue-600">with Confidence</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            HeimPath guides foreign investors and immigrants through every step
            of buying property in Germany — from research to closing, in a
            language you understand.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">Start Your Journey</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>

        {/* Decorative icon composition */}
        <div className="relative hidden h-64 w-64 md:block lg:h-80 lg:w-80">
          {HERO_ICONS.map(({ icon: Icon, color, size, iconSize, position }) => (
            <div
              key={position}
              className={`absolute ${position} flex ${size} items-center justify-center rounded-2xl ${color} shadow-sm`}
            >
              <Icon className={iconSize} />
            </div>
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
