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
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-heimpath.jpg`
const DEFAULT_OG_IMAGE_WIDTH = "1200"
const DEFAULT_OG_IMAGE_HEIGHT = "630"
const DEFAULT_OG_IMAGE_TYPE = "image/jpeg"
const DEFAULT_OG_IMAGE_ALT =
  "HeimPath — Navigate German Real Estate with Confidence"

/******************************************************************************
                              Types
******************************************************************************/

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

type LinkTag = { rel: string; href: string }

interface SeoOptions {
  /** Page title — will be set as <title> and og:title */
  title: string
  /** Meta description — also used for og:description and twitter:description */
  description?: string
  /** Canonical path (e.g., "/tools/mortgage-calculator"). Omit for no canonical. */
  path?: string
  /** Override the default OG image URL */
  ogImage?: string
  /** Alt text for the OG image — defaults to the brand tagline */
  ogImageAlt?: string
  /** OG type — defaults to "website" */
  ogType?: string
}

/** Return type for seoMeta — matches TanStack Router head() object shape. */
interface SeoHead {
  meta: MetaTag[]
  links: LinkTag[]
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Build a complete SEO head object for a TanStack Router head() function. */
function seoMeta(options: SeoOptions): SeoHead {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    ogImage = DEFAULT_OG_IMAGE,
    ogImageAlt = DEFAULT_OG_IMAGE_ALT,
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
    { property: "og:image:width", content: DEFAULT_OG_IMAGE_WIDTH },
    { property: "og:image:height", content: DEFAULT_OG_IMAGE_HEIGHT },
    { property: "og:image:type", content: DEFAULT_OG_IMAGE_TYPE },
    { property: "og:image:alt", content: ogImageAlt },
    { property: "og:locale", content: "en_US" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { name: "twitter:image:alt", content: ogImageAlt },
  ]

  if (canonicalUrl) {
    meta.push({ property: "og:url", content: canonicalUrl })
  }

  const links: LinkTag[] = canonicalUrl
    ? [{ rel: "canonical", href: canonicalUrl }]
    : []

  return { meta, links }
}

/******************************************************************************
                              Export
******************************************************************************/

export { seoMeta }
