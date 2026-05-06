import { Link } from "@tanstack/react-router"

/******************************************************************************
                              Constants
******************************************************************************/

const INTERNAL_LINKS = [
  { label: "Free Tools", to: "/tools" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Imprint", to: "/imprint" },
] as const

const EXTERNAL_LINKS = [
  { label: "Support", href: "mailto:support@heimpath.com" },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Footer with copyright and links. */
function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-muted-foreground text-xs">
          &copy; {currentYear} HeimPath. All rights reserved.
        </p>
        <nav className="flex items-center gap-4">
          {INTERNAL_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
          {EXTERNAL_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { Footer }
