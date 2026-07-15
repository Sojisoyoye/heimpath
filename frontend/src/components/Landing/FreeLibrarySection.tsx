import { Link } from "@tanstack/react-router"
import { ArrowRight, BookOpen, Languages, Scale } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

/** Free content library teaser for the landing page — no sign-up required. */
function FreeLibrarySection() {
  return (
    <section className="py-16 md:py-24" id="free-library">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <div className="mb-10 text-center md:mb-14">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              No sign-up required
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Read Before You Sign Up
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              50+ German property laws, in-depth guides, and a full glossary of
              real estate terms — all free to read, no account needed.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-3">
          {FREE_LIBRARY.map((item) => (
            <AnimateIn key={item.href}>
              <Card className="flex h-full flex-col">
                <CardHeader className="flex-1">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <Link to={item.href}>
                      {item.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </AnimateIn>
          ))}
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
