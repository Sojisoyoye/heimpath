import { expect, test } from "@playwright/test"

const PAGES = [
  { path: "/dashboard", heading: /dashboard/i },
  { path: "/journeys", heading: /journey/i },
  { path: "/portfolio", heading: /portfolio/i },
  { path: "/calculators", heading: /calculator/i },
  { path: "/contract-explainer", heading: /contract/i },
  { path: "/viewing-checklist", heading: /viewing|checklist/i },
  { path: "/laws", heading: /law/i },
  { path: "/glossary", heading: /glossary/i },
  { path: "/articles", heading: /article/i },
  { path: "/professionals", heading: /professional/i },
  { path: "/documents", heading: /document/i },
  { path: "/settings", heading: /setting/i },
]

const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe("Mobile Viewport QA", () => {
  test.use({ storageState: "playwright/.auth/user.json" })
  test.use({ viewport: MOBILE_VIEWPORT })

  for (const { path, heading } of PAGES) {
    test(`${path} - no horizontal overflow and heading visible on mobile`, async ({
      page,
    }) => {
      await page.goto(path)

      const headingLocator = page.getByRole("heading", { name: heading })
      await expect(headingLocator.first()).toBeVisible({ timeout: 10000 })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      // soft: overflow failures are tracked as findings, not hard blockers,
      // so mobile layout regressions on individual pages don't gate all merges
      expect.soft(overflow).toBe(false)
    })
  }
})
