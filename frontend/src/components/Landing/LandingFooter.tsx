import { Logo } from "@/components/Common/Logo"
import { Separator } from "@/components/ui/separator"

/******************************************************************************
                              Constants
******************************************************************************/

/** [title, [label, href][]] */
const FOOTER_COLUMNS: readonly [string, readonly [string, string][]][] = [
  [
    "Product",
    [
      ["Features", "#features"],
      ["How It Works", "#how-it-works"],
      ["Pricing", "#"],
    ],
  ],
  [
    "Free Tools",
    [
      ["Cost Calculator", "/tools/property-cost-calculator"],
      ["Mortgage Calculator", "/tools/mortgage-calculator"],
      ["ROI Calculator", "/tools/roi-calculator"],
    ],
  ],
  [
    "Company",
    [
      ["About", "#"],
      ["Blog", "#"],
      ["Contact", "mailto:support@heimpath.com"],
    ],
  ],
  [
    "Legal",
    [
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Imprint", "#"],
    ],
  ],
]

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Landing page footer with navigation columns. */
function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="space-y-4">
            <Logo variant="full" asLink={false} />
            <p className="max-w-xs text-sm text-muted-foreground">
              Helping foreign investors and immigrants navigate the German real
              estate market with confidence.
            </p>
          </div>

          {/* Navigation columns */}
          {FOOTER_COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-3 text-sm font-semibold">{title}</h3>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          {currentYear} HeimPath. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LandingFooter }
