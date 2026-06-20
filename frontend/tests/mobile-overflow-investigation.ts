/**
 * Mobile overflow investigation script.
 * Runs against production, uses iPhone 16 viewport (393x852).
 * Checks for horizontal overflow on dashboard and journey detail
 * pages both at rest and after accordion/step interactions.
 */

import fs from "node:fs"
import { chromium } from "@playwright/test"

const BASE_URL = "https://www.heimpath.com"
const IPHONE_16 = { width: 393, height: 852 }
const SCREENSHOTS_DIR = "/tmp/mobile-overflow-screenshots"

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function checkOverflow(page: any, label: string): Promise<boolean> {
  const result = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth
    const winW = window.innerWidth
    // Find any element that overflows to the right
    const all = document.querySelectorAll("*")
    const offenders: string[] = []
    for (const el of all) {
      const rect = el.getBoundingClientRect()
      if (rect.right > winW + 1) {
        offenders.push(
          `${el.tagName}.${[...el.classList].slice(0, 3).join(".")} right=${Math.round(rect.right)}px`,
        )
      }
    }
    return {
      docW,
      winW,
      overflows: docW > winW,
      offenders: offenders.slice(0, 5),
    }
  })
  const status = result.overflows ? "❌ OVERFLOW" : "✅ OK"
  console.log(`\n${status} [${label}]`)
  console.log(`  scrollWidth=${result.docW} innerWidth=${result.winW}`)
  if (result.offenders.length > 0) {
    console.log("  Offending elements:")
    result.offenders.forEach((o: string) => {
      console.log(`    - ${o}`)
    })
  }
  return result.overflows
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: IPHONE_16,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  })
  const page = await context.newPage()

  // --- Login ---
  console.log("Logging in...")
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState("networkidle")
  await page.getByTestId("email-input").fill("soji.soyoye@gmail.com")
  await page.getByTestId("password-input").fill("HeimPathQA2026!")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL("**/dashboard")
  await page.waitForLoadState("networkidle")
  console.log("Logged in.")

  // --- Dashboard ---
  console.log("\n=== DASHBOARD ===")
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/01-dashboard.png`,
    fullPage: false,
  })
  await checkOverflow(page, "dashboard - initial")

  // Scroll down on dashboard to see all cards
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/02-dashboard-scrolled.png`,
    fullPage: false,
  })
  await checkOverflow(page, "dashboard - scrolled 300px")

  await page.evaluate(() => window.scrollTo(0, 0))

  // --- Journeys list ---
  console.log("\n=== JOURNEYS LIST ===")
  await page.goto(`${BASE_URL}/journeys`)
  await page.waitForLoadState("networkidle")
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/03-journeys-list.png`,
    fullPage: true,
  })
  await checkOverflow(page, "journeys list")

  // --- Journey detail: navigate to first available journey ---
  console.log("\n=== JOURNEY DETAIL ===")
  // Click the first "Continue Journey" button
  const continueBtn = page
    .getByRole("link", { name: /continue journey/i })
    .first()
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    const journeyUrl = page.url()
    console.log("Journey URL:", journeyUrl)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/04-journey-detail.png`,
      fullPage: false,
    })
    await checkOverflow(page, "journey detail - initial")

    // Check if there are phase tabs (PhaseIconNav)
    const phaseTabs = page.locator("[aria-pressed]").first()
    if (await phaseTabs.isVisible()) {
      // Click each phase tab and check overflow
      const tabs = await page.locator("[aria-pressed]").all()
      console.log(`Found ${tabs.length} phase tabs`)
      for (let i = 0; i < Math.min(tabs.length, 4); i++) {
        await tabs[i].click()
        await page.waitForTimeout(800)
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/05-journey-phase-${i}.png`,
          fullPage: false,
        })
        await checkOverflow(page, `journey detail - phase tab ${i}`)
      }
    }

    // Check accordion/step cards - look for any expandable items
    const accordionTriggers = page.locator(
      '[data-state], button[aria-expanded], .accordion-trigger, [role="button"]',
    )
    const triggerCount = await accordionTriggers.count()
    console.log(`Found ${triggerCount} potential accordion/button elements`)

    // Look for step cards that can be expanded
    const stepCards = page
      .locator('button, [role="button"]')
      .filter({ hasText: /step|schritt/i })
    const stepCount = await stepCards.count()
    console.log(`Found ${stepCount} step-related clickable elements`)

    // Click through visible step cards
    const allClickable = await page
      .locator('div[class*="card"], div[class*="Card"]')
      .all()
    console.log(`Found ${allClickable.length} card elements`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/06-journey-after-interaction.png`,
      fullPage: true,
    })
    await checkOverflow(page, "journey detail - after interactions")
  } else {
    console.log("No journeys found. Checking journey from URL if possible.")
  }

  // --- Specifically check step/accordion content ---
  console.log("\n=== CHECKING STEP CONTENT ===")
  // Navigate back to journey and look for step content
  if (page.url().includes("/journeys/")) {
    // Look for any clickable step rows
    const clickableItems = await page.locator("button, a[href]").all()
    let _clickedSomething = false
    for (const item of clickableItems.slice(0, 10)) {
      const text = await item.textContent()
      if (
        text &&
        text.trim().length > 0 &&
        !text.includes("Sign") &&
        !text.includes("Log")
      ) {
        try {
          await item.click()
          await page.waitForTimeout(600)
          const ov = await checkOverflow(
            page,
            `after clicking: "${text?.slice(0, 30)}"`,
          )
          if (ov) {
            await page.screenshot({
              path: `${SCREENSHOTS_DIR}/07-overflow-after-click.png`,
              fullPage: false,
            })
          }
          _clickedSomething = true
          break
        } catch {
          // ignore
        }
      }
    }
  }

  // --- Full page screenshots of known problem pages ---
  console.log("\n=== FULL PAGE SHOTS ===")
  for (const [name, path] of [
    ["dashboard-full", "/dashboard"],
    ["journeys-full", "/journeys"],
  ]) {
    await page.goto(`${BASE_URL}${path}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true,
    })
    await checkOverflow(page, name)
  }

  await browser.close()
  console.log(`\nScreenshots saved to ${SCREENSHOTS_DIR}`)
})()
