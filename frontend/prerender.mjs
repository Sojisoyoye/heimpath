// Pre-renders public routes to static HTML at build time (SSG).
// Run after `vite build` + `vite build --ssr`.
// Output: dist/index.html, dist/tools/index.html, etc.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Suppress React's "act" warning in Node environment
process.env.IS_REACT_ACT_ENVIRONMENT = "false"

const _dirname = dirname(fileURLToPath(import.meta.url))
const { render } = await import("./dist/server/entry-server.js")

const template = readFileSync("./dist/index.html", "utf-8")

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
]

for (const url of ROUTES) {
  const appHtml = await render(url)
  const html = template.replace("<!--app-html-->", appHtml)
  const outPath = url === "/" ? "./dist/index.html" : `./dist${url}/index.html`
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html)
  console.log(`  ✓ pre-rendered ${url}`)
}

console.log(`\nSSG complete — ${ROUTES.length} routes pre-rendered.`)
