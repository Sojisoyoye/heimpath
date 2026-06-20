// Pre-renders public routes to static HTML at build time (SSG).
// Run after `vite build` + `vite build --ssr`.
// Output: dist/index.html, dist/tools/index.html, etc.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Suppress React's "act" warning in Node environment
process.env.IS_REACT_ACT_ENVIRONMENT = "false"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const { render } = await import("./dist/server/entry-server.js")

const template = readFileSync(resolve(scriptDir, "dist/index.html"), "utf-8")

const ROUTES = [
  "/",
  "/tools",
  "/tools/mortgage-calculator",
  "/tools/property-cost-calculator",
  "/tools/rent-vs-buy-calculator",
  "/tools/roi-calculator",
  "/imprint",
  "/privacy",
  "/terms",
  // Public content pages — high SEO value, pre-rendered for Google indexing
  // _layout is a pathless layout route; URL paths don't include it
  "/mortgage-guide",
  "/glossary",
  "/laws",
  "/articles",
  "/bank-account-guide",
  "/pricing",
]

for (const url of ROUTES) {
  try {
    const appHtml = await render(url)

    // TanStack Router renders head tags (<title>, <meta>, <link>) as part of
    // the renderToString output. Extract them and place them in <head> where
    // they belong semantically, then inject only the body content into #root.
    let headTags = ""
    let bodyHtml = appHtml

    // Extract <title>
    bodyHtml = bodyHtml.replace(/<title[^>]*>[\s\S]*?<\/title>/g, (match) => {
      headTags += match
      return ""
    })

    // Extract <meta> and <link> elements (head-only in HTML)
    bodyHtml = bodyHtml.replace(/<(?:meta|link)[^>]*\/?>/g, (match) => {
      headTags += match
      return ""
    })

    // Build the final HTML:
    // 1. Replace generic <title> with route-specific one (if SSR produced one)
    // 2. Append any remaining SSR head tags before </head>
    // 3. Inject rendered body content into #root placeholder
    // Use replacer functions to prevent $ sequences in content (e.g. $$, $&)
    // from being misinterpreted as String.replace capture-group specials.
    let html = template.replace("<!--app-html-->", () => bodyHtml)

    if (headTags) {
      // Replace the fallback <title> with the SSR-rendered route-specific title
      const ssrTitle = headTags.match(/<title[^>]*>[\s\S]*?<\/title>/)
      if (ssrTitle) {
        html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/, () => ssrTitle[0])
        headTags = headTags.replace(ssrTitle[0], "")
      }
      // Append remaining meta/link tags before </head>
      if (headTags.trim()) {
        const remaining = headTags
        html = html.replace("</head>", () => `${remaining}\n  </head>`)
      }
    }

    const outPath =
      url === "/"
        ? resolve(scriptDir, "dist/index.html")
        : resolve(scriptDir, `dist${url}/index.html`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, html)
    console.log(`  ✓ pre-rendered ${url}`)
  } catch (err) {
    console.error(`  ✗ failed to pre-render ${url}:`, err.message)
    process.exitCode = 1
  }
}

console.log(`\nSSG complete — ${ROUTES.length} routes attempted.`)
