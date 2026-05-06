/**
 * Partner Referral Banner
 * Reusable inline referral card for contextual partner recommendations
 */

import { ExternalLink } from "lucide-react"

interface IProps {
  partnerName: string
  description: string
  ctaLabel: string
  href: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Inline blue banner that contextually recommends a partner service. */
function PartnerReferralBanner({
  partnerName,
  description,
  ctaLabel,
  href,
}: Readonly<IProps>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-950/20">
      <p className="text-sm text-blue-800 dark:text-blue-300">
        <span className="font-medium">Partner tip:</span> {description}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${partnerName} (opens in new tab)`}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
      >
        {ctaLabel}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PartnerReferralBanner }
