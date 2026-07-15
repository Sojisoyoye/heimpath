/**
 * Translation E2E Test
 *
 * Uploads a German Kaufvertrag PDF and watches the translation UI flow
 * through processing to completion. The document pipeline (upload, status
 * polling, translation content) is mocked at the network layer rather than
 * exercising a real Celery worker + live Claude API call — a real external
 * API call in a required CI gate is slow, costly, and flakes on transient
 * API/rate-limit issues unrelated to this app's own code. This test verifies
 * the frontend UI wiring (upload → processing → completed → translation
 * viewer), not Claude's translation quality, which has its own backend-level
 * test coverage.
 *
 * Run headed (visible browser):
 *   cd frontend && bunx playwright test translation --headed --project=chromium
 */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIXTURE_PDF = path.join(__dirname, "fixtures/kaufvertrag-sample.pdf")
const MOCK_DOCUMENT_ID = "0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e"

const UPLOAD_RESPONSE = {
  id: MOCK_DOCUMENT_ID,
  original_filename: "kaufvertrag-sample.pdf",
  file_size_bytes: 51_200,
  page_count: 1,
  document_type: "kaufvertrag",
  status: "processing",
}

const TRANSLATION = {
  id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  document_id: MOCK_DOCUMENT_ID,
  source_language: "de",
  target_language: "en",
  translated_pages: [
    {
      page_number: 1,
      original_text: "Kaufvertrag über ein Grundstück...",
      translated_text:
        "Purchase agreement for a property. The buyer and seller agree, " +
        "subject to notary review and land register (Grundbuch) entry, " +
        "to the property transfer described below.",
    },
  ],
  clauses_detected: [],
  risk_warnings: [],
  kaufvertrag_analysis: null,
  type_analysis: null,
  glossary_links: [],
  processing_started_at: new Date().toISOString(),
  processing_completed_at: new Date().toISOString(),
  requires_manual_review: false,
  translation_confidence_score: 0.95,
  partial_translation_coverage: null,
}

/**
 * Mocks the document upload → status-poll → detail flow so the test
 * exercises the UI without a real Celery worker or Claude API call.
 * The status endpoint reports "processing" on its first poll, then
 * "completed" on every poll after — same UX shape as the real pipeline,
 * just deterministic instead of depending on real translation latency.
 */
async function mockDocumentTranslationPipeline(page: Page) {
  let statusPollCount = 0

  // A real upload has a network round-trip; a truly-instant mocked response
  // makes the transient "Uploading document..." indicator flash and vanish
  // before Playwright's assertion gets a chance to observe it. A small
  // artificial delay keeps that transient state actually observable.
  await page.route("**/api/v1/documents/upload", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return route.fulfill({ json: UPLOAD_RESPONSE })
  })

  await page.route(
    `**/api/v1/documents/${MOCK_DOCUMENT_ID}/status`,
    (route) => {
      statusPollCount += 1
      const isDone = statusPollCount > 1
      return route.fulfill({
        json: {
          id: MOCK_DOCUMENT_ID,
          status: isDone ? "completed" : "processing",
          error_message: null,
          page_count: 1,
        },
      })
    },
  )

  await page.route(`**/api/v1/documents/${MOCK_DOCUMENT_ID}`, (route) => {
    const isDone = statusPollCount > 1
    return route.fulfill({
      json: {
        ...UPLOAD_RESPONSE,
        status: isDone ? "completed" : "processing",
        error_message: null,
        share_id: null,
        journey_step_id: null,
        created_at: new Date().toISOString(),
        translation: isDone ? TRANSLATION : null,
        requires_subscription: false,
        upgrade_cta: null,
      },
    })
  })
}

test(
  "upload Kaufvertrag PDF and watch the translation UI complete",
  { tag: "@translation" },
  async ({ page }) => {
    await mockDocumentTranslationPipeline(page)

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

    // ── 6. Status flips to completed once the mocked poll reports it ────────
    await expect(page.getByText("Translation completed")).toBeVisible({
      timeout: 15_000,
    })

    // ── 7. Translation tab is active by default ─────────────────────────────
    const translationTab = page.getByRole("tab", { name: /translation/i })
    await expect(translationTab).toBeVisible()

    // ── 8. Side-by-side viewer shows Page 1 ────────────────────────────────
    await expect(page.getByText(/Page 1/i)).toBeVisible({ timeout: 10_000 })

    // ── 9. English translation text is visible ──────────────────────────────
    await expect(
      page
        .getByText(
          /purchase agreement|land register|buyer|seller|notary|property transfer|conveyance/i,
        )
        .first(),
    ).toBeVisible({ timeout: 10_000 })

    // ── 10. Risk warnings tab exists (always rendered, shows a count) ───────
    await expect(page.getByRole("tab", { name: /risk|warning/i })).toBeVisible()
  },
)
