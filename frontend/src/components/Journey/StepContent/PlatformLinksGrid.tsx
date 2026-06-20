/**
 * Platform Links Grid Component
 * Clickable cards linking to external property search portals.
 * Renders in a responsive grid with analytics data attributes.
 */

import { ExternalLink } from "lucide-react"

interface IPlatformLink {
  name: string
  url: string
  description: string
  analyticsId: string
}

interface IProps {
  platforms: readonly IPlatformLink[]
}

/******************************************************************************
                              Components
******************************************************************************/

/** Grid of clickable cards linking to property/rental portals. */
function PlatformLinksGrid(props: Readonly<IProps>) {
  const { platforms } = props

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {platforms.map((platform) => (
        <a
          key={platform.analyticsId}
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics="outbound-portal-click"
          data-portal={platform.analyticsId}
          className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{platform.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {platform.description}
            </p>
          </div>
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PlatformLinksGrid }
export type { IPlatformLink }
