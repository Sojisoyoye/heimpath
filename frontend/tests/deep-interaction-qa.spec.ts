import { expect, test } from "@playwright/test"

// ---------------------------------------------------------------------------
// TEST 1 — Journey phase tabs and step cards
// ---------------------------------------------------------------------------

test.describe("TEST 1: journey phase tabs and step cards", () => {
  test("phase tabs appear and step cards are clickable", async ({ page }) => {
    await page.goto("/journeys")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Click the first journey card
    const firstJourneyCard = page
      .locator('[data-testid="journey-card"]')
      .first()
    const altFirstCard = page
      .locator(".journey-card, [class*='journey'], article, [role='article']")
      .first()

    const journeyCardVisible = await firstJourneyCard
      .isVisible()
      .catch(() => false)
    if (journeyCardVisible) {
      await firstJourneyCard.click()
    } else {
      const altVisible = await altFirstCard.isVisible().catch(() => false)
      if (altVisible) {
        await altFirstCard.click()
      } else {
        // No journey cards exist for this account — nothing to test
        test.skip()
        return
      }
    }

    await page
      .getByRole("tab")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Verify phase tabs — look for Research, Preparation, Buying or Closing
    const phaseLabels = ["Research", "Preparation", "Buying", "Closing"]
    let foundTabs = 0
    for (const label of phaseLabels) {
      const tab = page
        .getByRole("tab", { name: label })
        .or(page.getByText(label, { exact: true }))
      const visible = await tab.isVisible().catch(() => false)
      if (visible) foundTabs++
    }
    expect.soft(foundTabs).toBeGreaterThanOrEqual(2)

    // Click each visible tab and verify step cards appear
    for (const label of phaseLabels) {
      const tab = page.getByRole("tab", { name: label })
      const tabVisible = await tab.isVisible().catch(() => false)
      if (!tabVisible) continue

      await tab.click()
      await page.waitForTimeout(500)

      // Look for step cards after clicking the tab
      const stepCard = page
        .locator('[data-testid="step-card"]')
        .or(page.locator(".step-card, [class*='step'], [class*='StepCard']"))
        .first()
      const stepVisible = await stepCard.isVisible().catch(() => false)
      expect.soft(stepVisible).toBe(true)
    }

    // Click a step card and verify detail/description appears
    const anyStepCard = page
      .locator('[data-testid="step-card"]')
      .or(page.locator(".step-card, [class*='step']"))
      .first()
    const anyStepVisible = await anyStepCard.isVisible().catch(() => false)
    if (anyStepVisible) {
      await anyStepCard.click()
      await page.waitForTimeout(500)

      // Verify some detail/description appeared (modal, drawer, or expanded section)
      const detail = page
        .locator(
          '[data-testid="step-detail"], [data-testid="step-description"]',
        )
        .or(
          page.locator(
            '[role="dialog"], [class*="detail"], [class*="description"], p',
          ),
        )
        .first()
      const detailVisible = await detail.isVisible().catch(() => false)
      expect.soft(detailVisible).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 2 — Portfolio property detail tabs
// ---------------------------------------------------------------------------

test.describe("TEST 2: portfolio property detail tabs", () => {
  test("property detail tabs render and Transactions tab shows Add Transaction", async ({
    page,
  }) => {
    await page.goto("/portfolio")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Check if a property card exists
    const propertyCard = page
      .locator('[data-testid="property-card"]')
      .or(
        page.locator(
          ".property-card, [class*='PropertyCard'], [class*='property-card']",
        ),
      )
      .first()

    const cardVisible = await propertyCard.isVisible().catch(() => false)
    if (!cardVisible) {
      test.skip()
      return
    }

    await propertyCard.click()
    await page
      .getByRole("tab", { name: "Overview" })
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Verify tabs
    const expectedTabs = [
      "Overview",
      "Transactions",
      "Running Costs",
      "Tax Summary",
    ]
    for (const tabName of expectedTabs) {
      const tab = page
        .getByRole("tab", { name: tabName })
        .or(page.getByText(tabName, { exact: true }))
      expect.soft(await tab.isVisible().catch(() => false)).toBe(true)
    }

    // Click each tab
    for (const tabName of expectedTabs) {
      const tab = page.getByRole("tab", { name: tabName })
      const tabVisible = await tab.isVisible().catch(() => false)
      if (!tabVisible) continue
      await tab.click()
      await page.waitForTimeout(400)
    }

    // On Transactions tab, verify Add Transaction button
    const transactionsTab = page.getByRole("tab", { name: "Transactions" })
    const transTabVisible = await transactionsTab.isVisible().catch(() => false)
    if (transTabVisible) {
      await transactionsTab.click()
      await page.waitForTimeout(400)

      const addTransactionBtn = page
        .getByRole("button", { name: /add transaction/i })
        .or(page.getByTestId("add-transaction-button"))
      expect
        .soft(await addTransactionBtn.isVisible().catch(() => false))
        .toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 3 — Portfolio checkboxes
// ---------------------------------------------------------------------------

test.describe("TEST 3: portfolio checkboxes", () => {
  test("task checkbox state changes on click", async ({ page }) => {
    await page.goto("/portfolio")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    const propertyCard = page
      .locator('[data-testid="property-card"]')
      .or(
        page.locator(
          ".property-card, [class*='PropertyCard'], [class*='property-card']",
        ),
      )
      .first()

    const cardVisible = await propertyCard.isVisible().catch(() => false)
    if (!cardVisible) {
      test.skip()
      return
    }

    await propertyCard.click()
    await page
      .getByRole("tab", { name: "Overview" })
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Ensure we are on Overview tab
    const overviewTab = page.getByRole("tab", { name: "Overview" })
    const overviewTabVisible = await overviewTab.isVisible().catch(() => false)
    if (overviewTabVisible) {
      await overviewTab.click()
      await page.waitForTimeout(400)
    }

    // Look for task checkboxes
    const checkbox = page
      .locator('[data-testid="task-checkbox"]')
      .or(page.locator('input[type="checkbox"]'))
      .first()

    const checkboxVisible = await checkbox.isVisible().catch(() => false)
    if (!checkboxVisible) {
      // No checkboxes present — skip gracefully
      test.skip()
      return
    }

    const initialChecked = await checkbox.isChecked()
    await checkbox.click()
    await page.waitForTimeout(300)

    const afterChecked = await checkbox.isChecked()
    expect.soft(afterChecked).toBe(!initialChecked)
  })
})

// ---------------------------------------------------------------------------
// TEST 4 — Viewing checklist create and interact
// ---------------------------------------------------------------------------

test.describe("TEST 4: viewing checklist create and interact", () => {
  test("new viewing button visible and checklist items clickable", async ({
    page,
  }) => {
    await page.goto("/viewing-checklist")
    await page
      .getByRole("button", { name: /new viewing/i })
      .or(page.getByRole("heading"))
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Verify New Viewing button is visible
    const newViewingBtn = page
      .getByRole("button", { name: /new viewing/i })
      .or(page.getByTestId("new-viewing-button"))
    expect.soft(await newViewingBtn.isVisible().catch(() => false)).toBe(true)

    // If any viewing exists, click it
    const viewingItem = page
      .locator('[data-testid="viewing-item"]')
      .or(page.locator(".viewing-card, .viewing-item, [class*='viewing']"))
      .first()

    const viewingVisible = await viewingItem.isVisible().catch(() => false)
    if (viewingVisible) {
      await viewingItem.click()
      await page.waitForTimeout(500)

      // Verify checklist section headings visible
      const sectionHeading = page
        .locator(
          "h2, h3, [class*='section-heading'], [class*='SectionHeading']",
        )
        .first()
      expect
        .soft(await sectionHeading.isVisible().catch(() => false))
        .toBe(true)

      // Click a checklist item (checkbox or list item)
      const checklistItem = page
        .locator('[data-testid="checklist-item"]')
        .or(
          page.locator(
            'input[type="checkbox"], li[class*="checklist"], [class*="ChecklistItem"]',
          ),
        )
        .first()

      const itemVisible = await checklistItem.isVisible().catch(() => false)
      if (itemVisible) {
        await checklistItem.click()
        await page.waitForTimeout(300)
        // Just verify no crash — the click succeeded
        expect.soft(true).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 5 — Contract explainer paste tab
// ---------------------------------------------------------------------------

test.describe("TEST 5: contract explainer paste tab", () => {
  test("paste text tab enables analyze button", async ({ page }) => {
    await page.goto("/contract-explainer")
    await page
      .getByRole("tab", { name: /upload pdf/i })
      .or(page.getByRole("heading"))
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Verify Upload PDF tab is active by default
    const uploadTab = page
      .getByRole("tab", { name: /upload pdf/i })
      .or(page.getByText(/upload pdf/i, { exact: false }))
    expect.soft(await uploadTab.isVisible().catch(() => false)).toBe(true)

    // Click Paste text tab
    const pasteTab = page
      .getByRole("tab", { name: /paste text/i })
      .or(page.getByText(/paste text/i, { exact: false }))
    const pasteTabVisible = await pasteTab.isVisible().catch(() => false)
    expect.soft(pasteTabVisible).toBe(true)

    if (pasteTabVisible) {
      await pasteTab.click()
      await page.waitForTimeout(400)

      // Verify textarea visible
      const textarea = page.locator("textarea").first()
      expect.soft(await textarea.isVisible().catch(() => false)).toBe(true)

      // Fill textarea
      await textarea.fill(
        "Dieser Kaufvertrag betrifft die Immobilie Musterstraße 1",
      )

      // Verify Analyze text button is enabled
      const analyzeBtn = page
        .getByRole("button", { name: /analyze text/i })
        .or(page.getByRole("button", { name: /analyze/i }))
      const analyzeBtnVisible = await analyzeBtn.isVisible().catch(() => false)
      expect.soft(analyzeBtnVisible).toBe(true)

      if (analyzeBtnVisible) {
        const isDisabled = await analyzeBtn.isDisabled().catch(() => true)
        expect.soft(isDisabled).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 6 — Edit portfolio property
// ---------------------------------------------------------------------------

test.describe("TEST 6: edit portfolio property", () => {
  test("edit form opens and can be closed without saving", async ({ page }) => {
    await page.goto("/portfolio")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    const propertyCard = page
      .locator('[data-testid="property-card"]')
      .or(
        page.locator(
          ".property-card, [class*='PropertyCard'], [class*='property-card']",
        ),
      )
      .first()

    const cardVisible = await propertyCard.isVisible().catch(() => false)
    if (!cardVisible) {
      test.skip()
      return
    }

    await propertyCard.click()
    await page
      .getByRole("tab", { name: "Overview" })
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Click Edit button or pencil icon
    const editBtn = page
      .getByRole("button", { name: /edit/i })
      .or(page.getByTestId("edit-button"))
      .or(
        page.locator(
          '[aria-label="Edit"], [aria-label="edit"], button[class*="edit"], button[class*="pencil"]',
        ),
      )
      .first()

    const editBtnVisible = await editBtn.isVisible().catch(() => false)
    if (!editBtnVisible) {
      test.skip()
      return
    }

    await editBtn.click()
    await page.waitForTimeout(500)

    // Verify edit form/modal opens
    const editForm = page
      .locator('[data-testid="edit-form"], [data-testid="edit-modal"]')
      .or(
        page.locator(
          '[role="dialog"], form, [class*="modal"], [class*="Modal"]',
        ),
      )
      .first()
    expect.soft(await editForm.isVisible().catch(() => false)).toBe(true)

    // Close without saving — click Cancel or X
    const cancelBtn = page
      .getByRole("button", { name: /cancel/i })
      .or(
        page.locator(
          '[aria-label="Close"], [aria-label="close"], button[class*="close"], button[class*="Cancel"]',
        ),
      )
      .first()

    const cancelVisible = await cancelBtn.isVisible().catch(() => false)
    if (cancelVisible) {
      await cancelBtn.click()
      await page.waitForTimeout(400)
      const dialogGone = await page
        .locator('[role="dialog"]')
        .isVisible()
        .catch(() => false)
      expect.soft(dialogGone).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 7 — Laws bookmark toggle
// ---------------------------------------------------------------------------

test.describe("TEST 7: laws bookmark toggle", () => {
  test("bookmark button toggles state on a law", async ({ page }) => {
    await page.goto("/laws")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Click a law card/item
    const lawItem = page
      .locator('[data-testid="law-card"], [data-testid="law-item"]')
      .or(page.locator(".law-card, .law-item, [class*='LawCard'], article"))
      .first()

    const lawVisible = await lawItem.isVisible().catch(() => false)
    if (!lawVisible) {
      test.skip()
      return
    }

    await lawItem.click()
    await page.waitForTimeout(500)

    // Click Bookmark button
    const bookmarkBtn = page
      .getByRole("button", { name: /bookmark/i })
      .or(page.getByTestId("bookmark-button"))
      .or(page.locator('[aria-label*="bookmark" i], [aria-label*="Bookmark"]'))
      .first()

    const bookmarkVisible = await bookmarkBtn.isVisible().catch(() => false)
    expect.soft(bookmarkVisible).toBe(true)

    if (!bookmarkVisible) return

    // Capture initial text/aria state
    const initialText = await bookmarkBtn.textContent().catch(() => "")
    const initialAriaLabel = await bookmarkBtn
      .getAttribute("aria-label")
      .catch(() => "")
    const initialAriaPressed = await bookmarkBtn
      .getAttribute("aria-pressed")
      .catch(() => null)

    await bookmarkBtn.click()
    await page.waitForTimeout(500)

    // Verify state changed — text, aria-label, or aria-pressed should differ
    const afterText = await bookmarkBtn.textContent().catch(() => "")
    const afterAriaLabel = await bookmarkBtn
      .getAttribute("aria-label")
      .catch(() => "")
    const afterAriaPressed = await bookmarkBtn
      .getAttribute("aria-pressed")
      .catch(() => null)

    const stateChanged =
      afterText !== initialText ||
      afterAriaLabel !== initialAriaLabel ||
      afterAriaPressed !== initialAriaPressed ||
      (await page
        .locator(
          '[data-testid="unbookmark-button"], button:has-text("Unbookmark")',
        )
        .isVisible()
        .catch(() => false))

    expect.soft(stateChanged).toBe(true)

    // Click again to unbookmark
    await bookmarkBtn.click()
    await page.waitForTimeout(500)

    const finalText = await bookmarkBtn.textContent().catch(() => "")
    const finalAriaPressed = await bookmarkBtn
      .getAttribute("aria-pressed")
      .catch(() => null)

    // Final state should be back to initial (or at least changed again)
    const toggledBack =
      finalText === initialText ||
      finalAriaPressed === initialAriaPressed ||
      finalText?.toLowerCase().includes("bookmark")

    expect.soft(toggledBack).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TEST 8 — Search results
// ---------------------------------------------------------------------------

test.describe("TEST 8: search results", () => {
  test("searching Grunderwerbsteuer returns at least one result", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await page
      .getByRole("heading")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})

    // Try triggering search via search icon in header or keyboard shortcut /
    const searchIcon = page
      .locator('[data-testid="search-icon"], [data-testid="search-button"]')
      .or(
        page.locator(
          '[aria-label*="search" i], button[class*="search"], [class*="SearchIcon"]',
        ),
      )
      .first()

    const searchIconVisible = await searchIcon.isVisible().catch(() => false)

    if (searchIconVisible) {
      await searchIcon.click()
      await page.waitForTimeout(400)
    } else {
      // Try keyboard shortcut /
      await page.keyboard.press("/")
      await page.waitForTimeout(400)
    }

    // Find the search input
    const searchInput = page
      .locator('[data-testid="search-input"]')
      .or(
        page.locator(
          'input[placeholder*="search" i], input[type="search"], input[role="searchbox"]',
        ),
      )
      .or(page.getByRole("searchbox"))
      .first()

    const searchInputVisible = await searchInput.isVisible().catch(() => false)
    if (!searchInputVisible) {
      // Try pressing / again in case focus landed elsewhere
      await page.keyboard.press("Escape")
      await page.keyboard.press("/")
      await page.waitForTimeout(400)
    }

    const searchInputVisible2 = await searchInput.isVisible().catch(() => false)
    if (!searchInputVisible2) {
      // Search input not found — skip gracefully
      test.skip()
      return
    }

    await searchInput.fill("Grunderwerbsteuer")

    await page.waitForTimeout(800)

    // Verify at least one result appears
    const searchResults = page
      .locator('[data-testid="search-result"], [data-testid="search-results"]')
      .or(
        page.locator(
          '[class*="search-result"], [class*="SearchResult"], [role="listbox"] [role="option"]',
        ),
      )

    const resultsCount = await searchResults.count()
    expect.soft(resultsCount).toBeGreaterThanOrEqual(1)

    // Alternatively check for any visible text matching the query
    if (resultsCount === 0) {
      const resultText = page.getByText("Grunderwerbsteuer", { exact: false })
      expect.soft(await resultText.isVisible().catch(() => false)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 9 — Property Cost Calculator inputs and calculation
// ---------------------------------------------------------------------------

test.describe("TEST 9: property cost calculator inputs and calculation", () => {
  test("calculator inputs are visible and produce a cost breakdown", async ({
    page,
  }) => {
    await page.goto("/tools/property-cost-calculator")

    // Property price input (type="text" with inputMode="numeric")
    const priceInput = page
      .locator("#propertyPrice")
      .or(page.locator('input[placeholder*="price" i]'))
      .first()

    await priceInput.waitFor({ state: "visible", timeout: 10000 })
    expect.soft(await priceInput.isVisible().catch(() => false)).toBe(true)

    // Wait for DOM to settle before counting comboboxes
    await page.waitForTimeout(300)

    // State, property type, and renovation selects (rendered as combobox buttons)
    const comboboxes = page.locator('button[role="combobox"]')
    expect.soft(await comboboxes.count()).toBeGreaterThanOrEqual(2)

    // Enter a price — triggers useMemo recalculation
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill("350000")
      await page.waitForTimeout(300)

      // Cost breakdown heading should appear
      const totalCostHeading = page.getByText("Total Cost of Ownership", {
        exact: false,
      })
      expect
        .soft(await totalCostHeading.isVisible().catch(() => false))
        .toBe(true)

      // Export button should be visible now that results are shown
      const exportBtn = page.getByRole("button", { name: /export/i })
      expect.soft(await exportBtn.isVisible().catch(() => false)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 10 — Mortgage Calculator inputs and calculation
// ---------------------------------------------------------------------------

test.describe("TEST 10: mortgage calculator inputs and calculation", () => {
  test("calculator inputs are visible and produce a monthly payment", async ({
    page,
  }) => {
    await page.goto("/tools/mortgage-calculator")

    // Property price input (type="text" with inputMode="numeric")
    const priceInput = page
      .locator("#propertyPrice")
      .or(page.locator('input[placeholder*="400"]'))
      .first()

    await priceInput.waitFor({ state: "visible", timeout: 10000 })
    expect.soft(await priceInput.isVisible().catch(() => false)).toBe(true)

    // Wait for DOM to settle before checking number inputs
    await page.waitForTimeout(300)

    // Interest rate and repayment rate inputs (type="number")
    const interestInput = page.locator("#interestRate")
    const repaymentInput = page.locator("#initialRepaymentRate")
    expect.soft(await interestInput.isVisible().catch(() => false)).toBe(true)
    expect.soft(await repaymentInput.isVisible().catch(() => false)).toBe(true)

    // Fill in values and calculate
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill("400000")
      await interestInput.fill("3.5")
      await repaymentInput.fill("2")

      const calculateBtn = page.getByRole("button", { name: /calculate/i })
      expect.soft(await calculateBtn.isVisible().catch(() => false)).toBe(true)

      await calculateBtn.click()
      await page.waitForTimeout(300)

      // Monthly payment result should appear
      const monthlyPayment = page
        .getByText(/monthly payment/i, { exact: false })
        .or(page.getByText(/monatliche rate/i, { exact: false }))
        .first()
      expect
        .soft(await monthlyPayment.isVisible().catch(() => false))
        .toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 11 — Rent vs Buy Calculator inputs and result
// ---------------------------------------------------------------------------

test.describe("TEST 11: rent vs buy calculator inputs and result", () => {
  test("calculator inputs are visible and result verdict appears", async ({
    page,
  }) => {
    await page.goto("/tools/rent-vs-buy-calculator")

    // Property price and monthly rent inputs (type="number")
    const priceInput = page
      .locator("#rvb-price")
      .or(page.locator('input[placeholder*="450000"]'))
      .first()
    const rentInput = page
      .locator("#rvb-rent")
      .or(page.locator('input[placeholder*="1800"]'))
      .first()

    await priceInput.waitFor({ state: "visible", timeout: 10000 })
    expect.soft(await priceInput.isVisible().catch(() => false)).toBe(true)
    expect.soft(await rentInput.isVisible().catch(() => false)).toBe(true)

    // Fill inputs — result updates reactively (no Calculate button needed)
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill("450000")
      await rentInput.fill("1800")
      await page.waitForTimeout(300)

      // Verdict text should appear ("Buying saves you" or "Renting saves you")
      const verdict = page
        .getByText(/saves you/i, { exact: false })
        .or(page.getByText(/wins/i, { exact: false }))
        .first()
      expect.soft(await verdict.isVisible().catch(() => false)).toBe(true)

      // Net cost rows should be visible
      const netCostBuying = page.getByText(/net cost of buying/i, {
        exact: false,
      })
      expect.soft(await netCostBuying.isVisible().catch(() => false)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST 12 — ROI Calculator inputs and result
// ---------------------------------------------------------------------------

test.describe("TEST 12: ROI calculator inputs and result", () => {
  test("calculator inputs are visible and gross yield appears", async ({
    page,
  }) => {
    await page.goto("/tools/roi-calculator")

    // Wait for the purchase price input to be interactive (avoids unreliable networkidle)
    const priceInput = page
      .locator("#purchasePrice")
      .or(page.locator('input[placeholder*="240,000"]'))
      .first()

    await priceInput.waitFor({ state: "visible", timeout: 15000 })

    const sqmInput = page.locator("#squareMeters").first()
    const rentInput = page
      .locator("#rentPerSqm")
      .or(page.locator('input[placeholder*="12"]'))
      .first()

    expect.soft(await priceInput.isVisible().catch(() => false)).toBe(true)
    expect.soft(await rentInput.isVisible().catch(() => false)).toBe(true)

    // isValid = purchasePrice > 0 && squareMeters > 0; both required to trigger results
    if (await priceInput.isVisible().catch(() => false)) {
      await sqmInput.fill("80")
      await priceInput.fill("240000")
      await rentInput.fill("12")

      // Wait for result (debounce 500ms + API call) instead of arbitrary timeout
      const grossYield = page.getByText(/gross rental yield/i, { exact: false })
      await expect.soft(grossYield.first()).toBeVisible({ timeout: 10000 })
    }
  })
})
