import { Link } from "@tanstack/react-router"
import { Check, Handshake, User, X } from "lucide-react"
import { Fragment } from "react"
import { Logo } from "@/components/Common/Logo"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Constants
******************************************************************************/

const ROWS = [
  {
    feature: "Language",
    diy: "German only",
    broker: "German only",
    heimpath: "English throughout",
  },
  {
    feature: "True cost breakdown",
    diy: false,
    broker: "Partial",
    heimpath: "All 14 cost types",
  },
  {
    feature: "State-by-state tax comparison",
    diy: false,
    broker: false,
    heimpath: "All 16 German states",
  },
  {
    feature: "Legal explanations",
    diy: false,
    broker: false,
    heimpath: "19 laws in plain English",
  },
  {
    feature: "Contract translation",
    diy: false,
    broker: false,
    heimpath: "Kaufvertrag & 4 others",
  },
  {
    feature: "Guided buying journey",
    diy: false,
    broker: false,
    heimpath: "5 phases, 13 steps",
  },
  {
    feature: "AfA depreciation calculator",
    diy: false,
    broker: false,
    heimpath: true,
  },
  {
    feature: "Available 24/7",
    diy: true,
    broker: false,
    heimpath: true,
  },
  {
    feature: "Works for your interests",
    diy: true,
    broker: "Works for seller",
    heimpath: true,
  },
  {
    feature: "Cost",
    diy: "Your time (weeks)",
    broker: "€10k–€25k commission",
    heimpath: "Free during beta",
  },
] as const

const COLUMNS = [
  { key: "diy", label: "DIY", icon: User },
  { key: "broker", label: "German Broker", icon: Handshake },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Renders a boolean as a colored check/x badge, or a string value as muted text. */
function CellValue(props: { value: string | boolean; muted?: boolean }) {
  const { value, muted } = props

  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
        <X className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span
      className={
        muted
          ? "text-xs text-muted-foreground"
          : "text-xs font-medium text-primary"
      }
    >
      {value}
    </span>
  )
}

/** Default component. Feature-comparison grid: DIY vs. German Broker vs. HeimPath. */
function ComparisonTable() {
  return (
    <section className="bg-muted/30 py-20 md:py-28" id="compare">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <AnimateIn>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
              Why Expats Choose HeimPath
            </h2>
            <p className="mt-4 text-muted-foreground">
              A good broker is invaluable — but they work for the seller.
              HeimPath works for you.
            </p>
          </div>
        </AnimateIn>

        <AnimateIn>
          <div className="grid grid-cols-[1.3fr_0.85fr_0.85fr_1fr]">
            {/* Header row */}
            <div />
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className="flex flex-col items-center gap-2 px-2 pb-6"
              >
                <col.icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {col.label}
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2 rounded-t-xl border border-b-0 border-primary/20 bg-card px-2 pt-4 pb-6">
              <Logo variant="icon" asLink={false} className="h-7 w-7" />
              <span className="text-xs font-semibold text-primary">
                HeimPath
              </span>
            </div>

            {/* Feature rows */}
            {ROWS.map((row) => (
              <Fragment key={row.feature}>
                <div className="flex items-center border-t py-4 pr-3 text-sm font-medium">
                  {row.feature}
                </div>
                <div className="flex items-center justify-center border-t py-4">
                  <CellValue value={row.diy} muted />
                </div>
                <div className="flex items-center justify-center border-t py-4">
                  <CellValue value={row.broker} muted />
                </div>
                <div className="flex items-center justify-center border-x border-t border-primary/20 bg-card py-4">
                  <CellValue value={row.heimpath} />
                </div>
              </Fragment>
            ))}

            {/* CTA row */}
            <div />
            <div />
            <div />
            <div className="flex justify-center rounded-b-xl border-x border-b border-primary/20 bg-card px-4 pt-2 pb-6">
              <Button size="sm" className="w-full" asChild>
                <Link to="/signup">Start My Journey</Link>
              </Button>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ComparisonTable }
