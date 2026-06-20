import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"

const BASE_URL = "https://www.heimpath.com"

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

let browser: Browser
let context: BrowserContext
let page: Page

test.describe("Mobile Viewport QA", () => {
  test.beforeAll(async ({ browser: b }) => {
    browser = b
    context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: MOBILE_VIEWPORT,
    })
    page = await context.newPage()

    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto("/login")
    await page.getByTestId("email-input").waitFor({ state: "visible", timeout: 15000 })

    await page.getByTestId("email-input").fill("soji.soyoye@gmail.com")
    await page.getByTestId("password-input").fill("HeimPathQA2026!")
    await page.getByRole("button", { name: "Sign In" }).click()

    await page.waitForURL("**/dashboard")
  })

  test.afterAll(async () => {
    await context.close()
  })

  for (const { path, heading } of PAGES) {
    test(`${path} - no horizontal overflow and heading visible on mobile`, async () => {
      await page.setViewportSize(MOBILE_VIEWPORT)
      await page.goto(path)

      const headingLocator = page.getByRole("heading", { name: heading })
      await expect(headingLocator.first()).toBeVisible({ timeout: 10000 })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      expect(overflow).toBe(false)
    })
  }
})
