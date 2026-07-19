/**
 * Shared bits for the calculator mini-previews
 */

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Mini metric display used across all three calculator previews. */
function PreviewMetric(props: { label: string; value: string }) {
  const { label, value } = props
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PreviewMetric, CURRENCY_FORMATTER }
