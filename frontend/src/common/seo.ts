/**
 * SEO Utilities
 * Centralized helpers for building meta tag arrays used by TanStack Router head()
 */

/******************************************************************************
                              Constants
******************************************************************************/

const SITE_URL = "https://heimpath.com"
const SITE_NAME = "HeimPath"
const DEFAULT_DESCRIPTION =
  "Navigate German real estate with confidence. Guided property journeys, financial calculators, legal knowledge, and document translation for foreign investors and immigrants."
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`

/******************************************************************************
                              Types
******************************************************************************/

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

interface SeoOptions {
  /** Page title — will be set as <title> and og:title */
  title: string
  /** Meta description — also used for og:description and twitter:description */
  description?: string
  /** Canonical path (e.g., "/tools/mortgage-calculator"). Omit for no canonical. */
  path?: string
  /** Override the default OG image URL */
  ogImage?: string
  /** OG type — defaults to "website" */
  ogType?: string
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Build a complete SEO meta array for a TanStack Router head() function. */
function seoMeta(options: SeoOptions) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
  } = options

  const canonicalUrl = path ? `${SITE_URL}${path}` : undefined

  const meta: MetaTag[] = [
    { title },
    { name: "description", content: description },

    // Open Graph
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: ogImage },
    { property: "og:locale", content: "en_US" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ]

  if (canonicalUrl) {
    meta.push({ property: "og:url", content: canonicalUrl })
  }

  return meta
}

/******************************************************************************
                              Export
******************************************************************************/

export { seoMeta }
