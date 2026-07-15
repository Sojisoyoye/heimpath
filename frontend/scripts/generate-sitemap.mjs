// Generates frontend/public/sitemap.xml at build time by fetching the full
// list of published articles, glossary terms, and laws from the public
// (unauthenticated) backend endpoints and adding a <url> entry for each
// individual page, alongside the static marketing/tool/legal pages.
//
// Safety: if the backend is unreachable or returns an error, this script
// logs a warning and leaves the existing sitemap.xml untouched rather than
// failing the build — SEO content freshness is not worth a broken deploy.
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const SITEMAP_PATH = resolve(scriptDir, "../public/sitemap.xml")

// Kept in sync with SITE_URL in src/common/seo.ts — duplicated rather than
// imported because this is a plain Node script run outside the Vite/TS build
// pipeline (it runs *before* `tsc`/`vite build`, so it cannot import .ts
// sources without adding a separate TS loader).
const SITE_ORIGIN = "https://heimpath.com"
// BACKEND_URL (non-VITE prefix) mirrors vite.config.ts's server-side-only
// convention — this script runs in Node at build time, never in the browser,
// so falling back to VITE_API_URL (used by the client bundle) is fine too.
const API_BASE =
  process.env.SITEMAP_API_URL ??
  process.env.VITE_API_URL ??
  "http://localhost:8000"
const API_V1 = `${API_BASE}/api/v1`

const PAGE_SIZE = 100
const TODAY = new Date().toISOString().slice(0, 10)

// Static pages that exist today regardless of backend content. Kept in sync
// with the previous hand-maintained sitemap.xml.
const STATIC_URLS = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/pricing", changefreq: "monthly", priority: "0.9" },
  { loc: "/mortgage-guide", changefreq: "monthly", priority: "0.9" },
  { loc: "/bank-account-guide", changefreq: "monthly", priority: "0.8" },
  { loc: "/articles", changefreq: "weekly", priority: "0.8" },
  { loc: "/laws", changefreq: "monthly", priority: "0.8" },
  { loc: "/glossary", changefreq: "monthly", priority: "0.7" },
  { loc: "/tools", changefreq: "monthly", priority: "0.9" },
  {
    loc: "/tools/property-cost-calculator",
    changefreq: "monthly",
    priority: "0.8",
  },
  { loc: "/tools/mortgage-calculator", changefreq: "monthly", priority: "0.8" },
  { loc: "/tools/roi-calculator", changefreq: "monthly", priority: "0.8" },
  {
    loc: "/tools/rent-vs-buy-calculator",
    changefreq: "monthly",
    priority: "0.8",
  },
  { loc: "/login", changefreq: "yearly", priority: "0.4" },
  { loc: "/signup", changefreq: "yearly", priority: "0.5" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/imprint", changefreq: "yearly", priority: "0.3" },
]

/**
 * Fetch every page of a paginated public list endpoint and return the
 * combined `data` array. Stops once `page * page_size >= total` (or once a
 * page comes back empty, as a safety net against off-by-one total counts).
 */
async function fetchAllPages(path) {
  const items = []
  let page = 1

  for (;;) {
    const url = `${API_V1}${path}?page=${page}&page_size=${PAGE_SIZE}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`${url} responded with ${response.status}`)
    }

    const body = await response.json()
    const pageItems = body.data ?? []
    items.push(...pageItems)

    const total = body.total ?? items.length
    if (pageItems.length === 0 || items.length >= total) {
      break
    }
    page += 1
  }

  return items
}

/**
 * Escape XML special characters so values coming from user/CMS-authored data
 * (article and glossary slugs) can't produce malformed sitemap.xml. A single
 * unescaped "&" would invalidate the entire file for every URL, not just the
 * offending one, so this is applied to every dynamic path segment.
 */
function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function buildUrlEntry({ loc, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(`${SITE_ORIGIN}${loc}`)}</loc>`,
    `    <lastmod>${TODAY}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n")
}

function buildSitemapXml(urls) {
  const body = urls.map(buildUrlEntry).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

/**
 * Convert a list of items into sitemap URL entries at `${basePath}/${item[idField]}`.
 * Items missing the id field are skipped with a warning rather than emitting
 * a broken `.../undefined` URL into the sitemap.
 */
function toDynamicUrls(basePath, items, idField) {
  const urls = []
  for (const item of items) {
    const identifier = item[idField]
    if (!identifier) {
      console.warn(
        `[generate-sitemap] Skipping ${basePath} item with missing "${idField}": ${JSON.stringify(item)}`,
      )
      continue
    }
    urls.push({
      loc: `${basePath}/${identifier}`,
      changefreq: "monthly",
      priority: "0.6",
    })
  }
  return urls
}

async function main() {
  let articles
  let glossaryTerms
  let laws

  try {
    ;[articles, glossaryTerms, laws] = await Promise.all([
      fetchAllPages("/articles/"),
      fetchAllPages("/glossary/"),
      fetchAllPages("/laws/"),
    ])
  } catch (err) {
    console.warn(
      `[generate-sitemap] Backend unreachable or returned an error (${err.message}). ` +
        "Leaving existing sitemap.xml untouched.",
    )
    return
  }

  const dynamicUrls = [
    ...toDynamicUrls("/articles", articles, "slug"),
    ...toDynamicUrls("/glossary", glossaryTerms, "slug"),
    ...toDynamicUrls("/laws", laws, "id"),
  ]

  const xml = buildSitemapXml([...STATIC_URLS, ...dynamicUrls])
  writeFileSync(SITEMAP_PATH, xml)
  console.log(
    `[generate-sitemap] Wrote ${STATIC_URLS.length + dynamicUrls.length} URLs ` +
      `(${articles.length} articles, ${glossaryTerms.length} glossary terms, ${laws.length} laws) to ${SITEMAP_PATH}`,
  )
}

await main()
