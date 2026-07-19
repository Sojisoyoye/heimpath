import { Link } from "@tanstack/react-router"
import { ArrowRight, BookOpen, Languages, Scale } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Constants
******************************************************************************/

const FREE_LIBRARY = [
  {
    icon: BookOpen,
    title: "Content Library",
    description:
      "12+ in-depth guides covering the buying process, costs and taxes, and common pitfalls for foreign buyers.",
    href: "/articles",
    cta: "Read the guides",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
  },
  {
    icon: Scale,
    title: "Legal Knowledge Base",
    description:
      "50+ German real estate laws and regulations explained in plain English.",
    href: "/laws",
    cta: "Browse the laws",
    color:
      "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
  },
  {
    icon: Languages,
    title: "Real Estate Glossary",
    description:
      "50+ German property terms translated and explained — no dictionary needed.",
    href: "/glossary",
    cta: "Explore the glossary",
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Free content library teaser for the landing page — headline on the left, a 2-per-row card grid on the right. */
function FreeLibrarySection() {
  return (
    <section
      className="relative overflow-hidden py-16 md:py-24"
      id="free-library"
    >
      {/* Cinematic library background — cards below are opaque, so only the
          surrounding text needs the overlay to stay legible. */}
      <img
        src="/images/library-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-background/92 via-background/88 to-background/75"
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <AnimateIn>
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              No sign-up required
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
              Read Before You Sign Up
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              50+ German property laws, in-depth guides, and a full glossary of
              real estate terms — all free to read, no account needed.
            </p>
          </AnimateIn>

          <AnimateIn delayMs={100}>
            <div className="grid grid-cols-2 gap-4">
              {FREE_LIBRARY.map((item, i) => (
                <AnimateIn key={item.href} delayMs={(i + 1) * 75}>
                  <Card className="flex h-full flex-col">
                    <CardContent className="flex-1 p-4">
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <Link to={item.href}>
                          {item.cta}
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </AnimateIn>
              ))}
            </div>
          </AnimateIn>
        </div>

        <AnimateIn>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Want to save your favorites?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create a free account
            </Link>{" "}
            to bookmark laws, track articles you've read, and personalize your
            feed.
          </p>
        </AnimateIn>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FreeLibrarySection }
