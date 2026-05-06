/**
 * Shared formatting utilities
 * Common formatters for dates, currencies, and percentages
 */

// ---------------------------------------------------------------------------
// Formatter instances (reusable, avoids re-creating Intl objects per call)
// ---------------------------------------------------------------------------

/** EUR currency formatter with 0 decimal places. */
export const EUR_FORMATTER_0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/** EUR currency formatter with 2 decimal places. */
export const EUR_FORMATTER_2 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

/** Percent formatter with 1 decimal place (Intl.NumberFormat style: "percent"). */
export const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

// ---------------------------------------------------------------------------
// Function-form formatters (convenient for templates / PDF generation)
// ---------------------------------------------------------------------------

/** Format a date string for display. */
export function formatDate(
  dateStr?: string,
  options?: Intl.DateTimeFormatOptions,
  fallback = "Not set",
): string {
  if (!dateStr) return fallback
  const defaults: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
  return new Date(dateStr).toLocaleDateString("en-US", options ?? defaults)
}

/** Format an amount as EUR currency with no decimals. */
export function formatEur(amount?: number, fallback = "Not specified"): string {
  if (amount == null) return fallback
  return EUR_FORMATTER_0.format(amount)
}

/** Format an amount as EUR currency with 2 decimal places. */
export function formatEur2(amount: number): string {
  return EUR_FORMATTER_2.format(amount)
}

/** Format a whole-number percentage string (e.g. 3.57 -> "3.57 %"). */
export function formatPct(value: number): string {
  return `${value.toFixed(2)} %`
}

/** Format a decimal as percentage string (e.g. 0.042 -> "4.20 %"). */
export function formatPctFromDecimal(value: number): string {
  return `${(value * 100).toFixed(2)} %`
}

/** Format a number as a factor display (e.g. 33.2 -> "33.2x"). */
export function formatFactor(value: number): string {
  return `${value.toFixed(1)}x`
}
