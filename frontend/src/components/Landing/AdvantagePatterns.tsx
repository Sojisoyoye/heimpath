/**
 * Decorative inline SVG background patterns for each "Why HeimPath?" advantage card.
 * Positioned absolutely in the bottom-right corner at low opacity.
 * Dark-mode aware via Tailwind classes.
 */

/******************************************************************************
                              Components
******************************************************************************/

/** Globe/world pattern for International Buyers card. */
function GlobePattern() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-28 w-28 opacity-[0.08] dark:opacity-[0.06]"
    >
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        strokeWidth="2"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
      {/* Latitude lines */}
      <ellipse
        cx="60"
        cy="60"
        rx="50"
        ry="20"
        fill="none"
        strokeWidth="1.5"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
      <ellipse
        cx="60"
        cy="60"
        rx="50"
        ry="38"
        fill="none"
        strokeWidth="1.5"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
      {/* Meridian lines */}
      <ellipse
        cx="60"
        cy="60"
        rx="20"
        ry="50"
        fill="none"
        strokeWidth="1.5"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
      <line
        x1="10"
        y1="60"
        x2="110"
        y2="60"
        strokeWidth="1.5"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
    </svg>
  )
}

/** Shield/checkmark pattern for Risk-Aware Guidance card. */
function ShieldPattern() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-28 w-28 opacity-[0.08] dark:opacity-[0.06]"
    >
      {/* Shield shape */}
      <path
        d="M60 10 L100 30 L100 65 Q100 95 60 110 Q20 95 20 65 L20 30 Z"
        fill="none"
        strokeWidth="2.5"
        className="stroke-purple-500 dark:stroke-purple-400"
      />
      {/* Checkmark */}
      <polyline
        points="42,60 55,75 80,45"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-purple-500 dark:stroke-purple-400"
      />
    </svg>
  )
}

/** Euro/chart pattern for Cost Transparency card. */
function ChartPattern() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-28 w-28 opacity-[0.08] dark:opacity-[0.06]"
    >
      {/* Bar chart bars */}
      <rect
        x="15"
        y="70"
        width="16"
        height="40"
        rx="2"
        className="fill-orange-500 dark:fill-orange-400"
      />
      <rect
        x="37"
        y="45"
        width="16"
        height="65"
        rx="2"
        className="fill-orange-500 dark:fill-orange-400"
      />
      <rect
        x="59"
        y="55"
        width="16"
        height="55"
        rx="2"
        className="fill-orange-500 dark:fill-orange-400"
      />
      <rect
        x="81"
        y="25"
        width="16"
        height="85"
        rx="2"
        className="fill-orange-500 dark:fill-orange-400"
      />
      {/* Trend line */}
      <polyline
        points="23,65 45,40 67,50 89,20"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-orange-500 dark:stroke-orange-400"
      />
    </svg>
  )
}

/** Dashboard/grid pattern for Post-Purchase Support card. */
function DashboardPattern() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-28 w-28 opacity-[0.08] dark:opacity-[0.06]"
    >
      {/* Dashboard grid */}
      <rect
        x="10"
        y="10"
        width="45"
        height="45"
        rx="4"
        fill="none"
        strokeWidth="2.5"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
      <rect
        x="65"
        y="10"
        width="45"
        height="20"
        rx="4"
        fill="none"
        strokeWidth="2.5"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
      <rect
        x="65"
        y="40"
        width="45"
        height="15"
        rx="4"
        className="fill-teal-500 dark:fill-teal-400"
      />
      <rect
        x="10"
        y="65"
        width="100"
        height="45"
        rx="4"
        fill="none"
        strokeWidth="2.5"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
      {/* Mini line chart inside bottom panel */}
      <polyline
        points="20,95 40,80 60,88 80,75 100,82"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
    </svg>
  )
}

/******************************************************************************
                              Constants
******************************************************************************/

const ADVANTAGE_PATTERNS = [
  GlobePattern,
  ShieldPattern,
  ChartPattern,
  DashboardPattern,
] as const

/******************************************************************************
                              Export
******************************************************************************/

export { ADVANTAGE_PATTERNS }
