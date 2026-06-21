/**
 * Translation E2E Test
 *
 * Uploads a German Kaufvertrag PDF, watches it process through the
 * Claude translation pipeline, and verifies the English translation
 * appears live in the browser.
 *
 * Run headed (visible browser):
 *   cd frontend && bunx playwright test translation --headed --project=chromium
 *
 * Requires: docker compose up (backend + Celery worker + Redis)
 * Requires: ANTHROPIC_API_KEY set in .env
 */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIXTURE_PDF = path.join(__dirname, "fixtures/kaufvertrag-sample.pdf")

// Slow motion makes the translation process visible when running headed locally.
// Disabled in CI where no human is watching.
test.use({
  launchOptions: { slowMo: process.env.CI ? 0 : 400 },
})

test(
  "upload Kaufvertrag PDF and watch Claude translate it live",
  { tag: "@translation" },
  async ({ page }) => {
    test.setTimeout(300_000)
    // ── 1. Navigate to Documents page ──────────────────────────────────────
    await page.goto("/documents")
    await expect(
      page.getByRole("heading", { name: "Document Translation" }),
    ).toBeVisible()

    // ── 2. Upload the PDF via the hidden file input ─────────────────────────
    const fileInput = page.locator('input[type="file"][accept=".pdf"]')
    await fileInput.setInputFiles(FIXTURE_PDF)

    // ── 3. Uploading indicator appears briefly ──────────────────────────────
    await expect(page.getByText("Uploading document...")).toBeVisible({
      timeout: 10_000,
    })

    // ── 4. Auto-redirect to the document detail page ────────────────────────
    await page.waitForURL(/\/documents\/[a-f0-9-]{36}$/, { timeout: 30_000 })

    // ── 5. Processing status appears (spinner visible) ──────────────────────
    await expect(
      page.getByText(/Queued for processing|Translating document/i),
    ).toBeVisible({ timeout: 15_000 })

    // ── 6. Wait for Claude to finish — "Translation completed" in green ──────
    // Translation via Claude haiku takes 15–90 s depending on server load.
    await expect(page.getByText("Translation completed")).toBeVisible({
      timeout: 180_000,
    })

    // ── 7. Translation tab is active by default ─────────────────────────────
    const translationTab = page.getByRole("tab", { name: /translation/i })
    await expect(translationTab).toBeVisible()

    // ── 8. Side-by-side viewer shows Page 1 ────────────────────────────────
    await expect(page.getByText(/Page 1/i)).toBeVisible({ timeout: 10_000 })

    // ── 9. English translation text is visible ──────────────────────────────
    // The Kaufvertrag contains Kaufvertrag, Grundbuch, Auflassung etc.
    // Claude should produce English terms like "purchase", "land register", etc.
    await expect(
      page
        .getByText(
          /purchase agreement|land register|buyer|seller|notary|property transfer|conveyance/i,
        )
        .first(),
    ).toBeVisible({ timeout: 10_000 })

    // ── 10. Risk warnings tab exists (legal terms were detected) ────────────
    await expect(page.getByRole("tab", { name: /risk|warning/i })).toBeVisible()
  },
)
