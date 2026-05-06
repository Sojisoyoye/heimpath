/**
 * SEO meta helper for tools pages.
 * Wraps the central seoMeta utility with the /tools path prefix.
 */

import { seoMeta } from "@/common/seo"

/** Build SEO meta array for a tools page. */
function toolsMeta(title: string, description: string, path?: string) {
  return seoMeta({ title, description, path })
}

export { toolsMeta }
