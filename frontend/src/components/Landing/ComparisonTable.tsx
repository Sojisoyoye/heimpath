import { Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
    heimpathHighlight: true,
  },
  {
    feature: "True cost breakdown",
    diy: false,
    broker: "Partial",
    heimpath: "All 14 cost types",
    heimpathHighlight: true,
  },
  {
    feature: "State-by-state tax comparison",
    diy: false,
    broker: false,
    heimpath: "All 16 German states",
    heimpathHighlight: true,
  },
  {
    feature: "Legal explanations",
    diy: false,
    broker: false,
    heimpath: "19 laws in plain English",
    heimpathHighlight: true,
  },
  {
    feature: "Contract translation",
    diy: false,
    broker: false,
    heimpath: "Kaufvertrag & 4 others",
    heimpathHighlight: true,
  },
  {
    feature: "Guided buying journey",
    diy: false,
    broker: false,
    heimpath: "5 phases, 13 steps",
    heimpathHighlight: true,
  },
  {
    feature: "AfA depreciation calculator",
    diy: false,
    broker: false,
    heimpath: true,
    heimpathHighlight: true,
  },
  {
    feature: "Available 24/7",
    diy: true,
    broker: false,
    heimpath: true,
    heimpathHighlight: false,
  },
  {
    feature: "Works for your interests",
    diy: true,
    broker: "Works for seller",
    heimpath: true,
    heimpathHighlight: true,
  },
  {
    feature: "Cost",
    diy: "Your time (weeks)",
    broker: "€10k–€25k commission",
    heimpath: "Free during beta",
    heimpathHighlight: true,
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-emerald-600" />
  if (value === false) return <X className="mx-auto h-4 w-4 text-rose-400" />
  return <span className="text-xs text-muted-foreground">{value}</span>
}

/** Three-column comparison: DIY vs German Broker vs HeimPath. */
function ComparisonTable() {
  return (
    <section className="bg-muted/30 py-20 md:py-28" id="compare">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <AnimateIn>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Why Expats Choose HeimPath
            </h2>
            <p className="mt-4 text-muted-foreground">
              A good broker is invaluable — but they work for the seller.
              HeimPath works for you.
            </p>
          </div>
        </AnimateIn>

        <AnimateIn>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    DIY
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    German Broker
                  </th>
                  <th className="relative px-4 py-3 text-center font-semibold text-primary">
                    <span>HeimPath</span>
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary/10 text-primary text-[10px]"
                    >
                      Most helpful
                    </Badge>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      <CellValue value={row.diy} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CellValue value={row.broker} />
                    </td>
                    <td
                      className={`px-4 py-3 text-center ${row.heimpathHighlight ? "text-emerald-700 font-medium" : ""}`}
                    >
                      <CellValue value={row.heimpath} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
