/******************************************************************************
                              Constants
******************************************************************************/

const FOOTER_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "mailto:support@heimpath.de" },
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
          {currentYear} HeimPath. All rights reserved.
        </p>
        <nav className="flex items-center gap-4">
          {FOOTER_LINKS.map(({ label, href }) => (
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
