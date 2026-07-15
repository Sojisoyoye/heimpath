import { expect, test } from "@playwright/test"

// Anonymous (logged-out) access — do not use the authenticated storage state.
test.use({ storageState: { cookies: [], origins: [] } })

test("Anonymous user can browse the articles list", async ({ page }) => {
  await page.goto("/articles")

  await expect(page).toHaveURL("/articles")
  await expect(
    page.getByRole("heading", { name: "Content Library" }),
  ).toBeVisible()
})

test("Anonymous user can view an article detail page", async ({ page }) => {
  await page.goto("/articles")

  const firstArticleLink = page.locator('a[href^="/articles/"]').first()
  await firstArticleLink.waitFor()
  await firstArticleLink.click()

  await expect(page).toHaveURL(/\/articles\/[^/]+$/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("Anonymous user can browse the glossary list", async ({ page }) => {
  await page.goto("/glossary")

  await expect(page).toHaveURL("/glossary")
  await expect(
    page.getByRole("heading", { name: "German Real Estate Glossary" }),
  ).toBeVisible()
})

test("Anonymous user can view a glossary term detail page", async ({
  page,
}) => {
  await page.goto("/glossary")

  const firstTermLink = page.locator('a[href^="/glossary/"]').first()
  await firstTermLink.waitFor()
  await firstTermLink.click()

  await expect(page).toHaveURL(/\/glossary\/[^/]+$/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("Anonymous user can browse the laws list", async ({ page }) => {
  await page.goto("/laws")

  await expect(page).toHaveURL("/laws")
  await expect(
    page.getByRole("heading", { name: "Legal Knowledge Base" }),
  ).toBeVisible()

  // The bookmarks CTA is a logged-in-only feature and must not be shown.
  await expect(
    page.getByRole("link", { name: "My Bookmarks" }),
  ).not.toBeVisible()
})

test("Anonymous user can view a law detail page", async ({ page }) => {
  await page.goto("/laws")

  const firstLawLink = page.locator('a[href^="/laws/"]').first()
  await firstLawLink.waitFor()
  await firstLawLink.click()

  await expect(page).toHaveURL(/\/laws\/[^/]+$/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("Anonymous user is redirected to /login from /laws/bookmarks", async ({
  page,
}) => {
  await page.goto("/laws/bookmarks")
  await page.waitForURL("/login")
  await expect(page).toHaveURL("/login")
})
