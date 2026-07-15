/**
 * Signup Gating E2E Test
 *
 * Verifies the lead-gen CTA banner for anonymous visitors:
 * - A lead-gen CTA banner is present on article/law/glossary detail pages
 *   for anonymous (logged-out) visitors.
 * - The banner does not render for logged-in users.
 *
 * The click-blocking/redirect behavior for rating and bookmarking as an
 * anonymous user is owned by a sibling test suite, not this one.
 */

import { expect, test } from "@playwright/test"

test.describe("anonymous sign-up gating", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("lead-gen CTA banner is present on the article detail page", async ({
    page,
  }) => {
    await page.goto("/articles")
    await page.getByRole("link", { name: "Read more →" }).first().click()
    await page.waitForURL(/\/articles\/.+/)

    // Scoped to the banner region — the page also has an unrelated
    // "Sign up free" link in the public layout's header CTA, so an
    // unscoped page-wide search matches both and fails a strict-mode check.
    const banner = page.getByRole("region", { name: "Sign up prompt" })
    await expect(banner).toBeVisible()
    await expect(
      banner.getByRole("link", { name: "Sign Up Free" }),
    ).toBeVisible()
  })

  test("lead-gen CTA banner is present on the law detail page", async ({
    page,
  }) => {
    await page.goto("/laws")
    await page.getByRole("link", { name: "Read more →" }).first().click()
    await page.waitForURL(/\/laws\/.+/)

    await expect(
      page.getByRole("region", { name: "Sign up prompt" }),
    ).toBeVisible()
  })

  test("lead-gen CTA banner is present on the glossary detail page", async ({
    page,
  }) => {
    await page.goto("/glossary")
    await page.getByRole("link", { name: "Learn more →" }).first().click()
    await page.waitForURL(/\/glossary\/.+/)

    await expect(
      page.getByRole("region", { name: "Sign up prompt" }),
    ).toBeVisible()
  })
})

test.describe("logged-in users do not see the sign-up CTA", () => {
  test("lead-gen CTA banner is absent on the article detail page", async ({
    page,
  }) => {
    await page.goto("/articles")
    await page.getByRole("link", { name: "Read more →" }).first().click()
    await page.waitForURL(/\/articles\/.+/)

    await expect(
      page.getByRole("region", { name: "Sign up prompt" }),
    ).not.toBeVisible()
  })

  test("lead-gen CTA banner is absent on the law detail page", async ({
    page,
  }) => {
    await page.goto("/laws")
    await page.getByRole("link", { name: "Read more →" }).first().click()
    await page.waitForURL(/\/laws\/.+/)

    await expect(
      page.getByRole("region", { name: "Sign up prompt" }),
    ).not.toBeVisible()
  })

  test("lead-gen CTA banner is absent on the glossary detail page", async ({
    page,
  }) => {
    await page.goto("/glossary")
    await page.getByRole("link", { name: "Learn more →" }).first().click()
    await page.waitForURL(/\/glossary\/.+/)

    await expect(
      page.getByRole("region", { name: "Sign up prompt" }),
    ).not.toBeVisible()
  })
})
