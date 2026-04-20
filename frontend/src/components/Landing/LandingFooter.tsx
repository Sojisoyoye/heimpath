import { Link } from "@tanstack/react-router"

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
  ["Company", [["Contact", "mailto:support@heimpath.com"]]],
  [
    "Legal",
    [
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Imprint", "/imprint"],
    ],
  ],
]

/** Check if href is an internal route (starts with / but not # or mailto:). */
function isInternalRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("mailto:")
}

/******************************************************************************
                              Components
******************************************************************************/

/** Footer link — uses TanStack Link for internal routes, plain <a> otherwise. */
function FooterLink(props: { href: string; children: React.ReactNode }) {
  const { href, children } = props
  const className =
    "text-sm text-muted-foreground transition-colors hover:text-foreground"

  if (isInternalRoute(href)) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

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
                    <FooterLink href={href}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          &copy; {currentYear} HeimPath. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LandingFooter }
