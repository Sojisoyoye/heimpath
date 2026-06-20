import { expect, type Page, test } from "@playwright/test"

// iPhone 16 viewport — matches the investigation script used to discover these bugs
test.use({ viewport: { width: 393, height: 852 } })

// Check every element's right edge against the viewport — works even when
// overflow-x-hidden on a parent clips children without inflating scrollWidth.
// Returns a description of the first offending element, or null when all clear.
async function firstOverflow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const w = window.innerWidth
    for (const el of document.querySelectorAll("*")) {
      if (el.getBoundingClientRect().right > w + 1) {
        const tag = el.tagName.toLowerCase()
        const cls = [...el.classList].slice(0, 3).join(".")
        const id = el.id ? `#${el.id}` : ""
        return `<${tag}${id}${cls ? `.${cls}` : ""}> right=${Math.round(el.getBoundingClientRect().right)}px > ${w}px`
      }
    }
    return null
  })
}

test.describe("Mobile viewport QA (393×852)", () => {
  test("dashboard: h1 greets with 'Welcome back'", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")

    // Use CSS locator rather than getByRole so the heading is found even when
    // the OnboardingWizard dialog is open (Radix sets aria-hidden on the body,
    // which removes the heading from the accessibility tree).
    const heading = page.locator("h1").first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    await expect(heading).toContainText(/welcome back/i)
  })

  test("laws: h1 says 'Legal Knowledge Base' with no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/laws")
    await page.waitForLoadState("networkidle")

    await expect(
      page.getByRole("heading", { name: "Legal Knowledge Base" }),
    ).toBeVisible({ timeout: 10_000 })

    const offender = await firstOverflow(page)
    expect(offender, "horizontal overflow on /laws at 393 px width").toBeNull()
  })

  test("articles: h1 says 'Content Library' with no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/articles")
    await page.waitForLoadState("networkidle")

    await expect(
      page.getByRole("heading", { name: "Content Library" }),
    ).toBeVisible({ timeout: 10_000 })

    const offender = await firstOverflow(page)
    expect(
      offender,
      "horizontal overflow on /articles at 393 px width",
    ).toBeNull()
  })
})
