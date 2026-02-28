/**
 * Shared formatting utilities
 * Common formatters for dates and currencies
 */

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
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}
