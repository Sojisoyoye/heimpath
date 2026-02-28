import { Logo } from "@/components/Common/Logo"
import { Separator } from "@/components/ui/separator"

/******************************************************************************
                              Constants
******************************************************************************/

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "mailto:support@heimpath.de" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Imprint", href: "#" },
    ],
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Landing page footer with navigation columns. */
function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="space-y-4">
            <Logo variant="full" asLink={false} />
            <p className="max-w-xs text-sm text-muted-foreground">
              Helping foreign investors and immigrants navigate the German real
              estate market with confidence.
            </p>
          </div>

          {/* Navigation columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-semibold">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
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
