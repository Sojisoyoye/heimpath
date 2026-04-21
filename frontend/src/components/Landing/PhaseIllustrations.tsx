/**
 * Decorative inline SVG illustrations for each "How It Works" phase.
 * Small (~80×80 viewBox), themed with Tailwind classes, dark-mode aware.
 */

/******************************************************************************
                              Components
******************************************************************************/

/** Research phase — magnifying glass over a house outline. */
function ResearchIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* House outline */}
      <rect
        x="14"
        y="40"
        width="32"
        height="26"
        rx="2"
        className="fill-blue-100 dark:fill-blue-900/50"
      />
      <polygon
        points="10,40 30,22 50,40"
        className="fill-blue-200 dark:fill-blue-800/60"
      />
      {/* Door */}
      <rect
        x="24"
        y="52"
        width="12"
        height="14"
        rx="2"
        className="fill-blue-300 dark:fill-blue-700/60"
      />
      {/* Magnifying glass */}
      <circle
        cx="54"
        cy="34"
        r="14"
        fill="none"
        strokeWidth="3"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
      <line
        x1="64"
        y1="44"
        x2="74"
        y2="54"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-blue-500 dark:stroke-blue-400"
      />
    </svg>
  )
}

/** Preparation phase — clipboard with checkmarks. */
function PreparationIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Clipboard body */}
      <rect
        x="16"
        y="14"
        width="48"
        height="56"
        rx="4"
        className="fill-purple-100 dark:fill-purple-900/50"
      />
      {/* Clipboard clip */}
      <rect
        x="28"
        y="8"
        width="24"
        height="12"
        rx="3"
        className="fill-purple-300 dark:fill-purple-700/60"
      />
      {/* Check lines */}
      <polyline
        points="24,32 28,36 34,28"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-purple-500 dark:stroke-purple-400"
      />
      <line
        x1="40"
        y1="32"
        x2="56"
        y2="32"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-purple-300 dark:stroke-purple-600"
      />
      <polyline
        points="24,46 28,50 34,42"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-purple-500 dark:stroke-purple-400"
      />
      <line
        x1="40"
        y1="46"
        x2="56"
        y2="46"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-purple-300 dark:stroke-purple-600"
      />
      {/* Empty checkbox */}
      <rect
        x="23"
        y="56"
        width="12"
        height="10"
        rx="2"
        fill="none"
        strokeWidth="2"
        className="stroke-purple-300 dark:stroke-purple-600"
      />
      <line
        x1="40"
        y1="60"
        x2="52"
        y2="60"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-purple-300 dark:stroke-purple-600"
      />
    </svg>
  )
}

/** Buying phase — handshake. */
function BuyingIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Background circle */}
      <circle
        cx="40"
        cy="40"
        r="30"
        className="fill-orange-100 dark:fill-orange-900/40"
      />
      {/* Left hand */}
      <path
        d="M 12 42 L 28 42 L 38 34 L 44 40"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-orange-500 dark:stroke-orange-400"
      />
      {/* Right hand */}
      <path
        d="M 68 42 L 52 42 L 44 40 L 38 46"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-orange-500 dark:stroke-orange-400"
      />
      {/* Handshake grip */}
      <path
        d="M 34 40 C 38 48, 46 48, 50 40"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-orange-600 dark:stroke-orange-300"
      />
      {/* Euro symbol */}
      <circle
        cx="40"
        cy="22"
        r="8"
        className="fill-orange-200 dark:fill-orange-800/60"
      />
      <text
        x="40"
        y="26"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        className="fill-orange-600 dark:fill-orange-300"
      >
        €
      </text>
    </svg>
  )
}

/** Closing phase — key next to a house. */
function ClosingIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* House */}
      <rect
        x="38"
        y="36"
        width="30"
        height="28"
        rx="2"
        className="fill-green-100 dark:fill-green-900/50"
      />
      <polygon
        points="34,36 53,18 72,36"
        className="fill-green-200 dark:fill-green-800/60"
      />
      {/* Door */}
      <rect
        x="48"
        y="48"
        width="10"
        height="16"
        rx="2"
        className="fill-green-300 dark:fill-green-700/60"
      />
      {/* Key */}
      <g transform="translate(22, 50) rotate(-20)">
        <circle
          cx="0"
          cy="0"
          r="8"
          fill="none"
          strokeWidth="2.5"
          className="stroke-green-500 dark:stroke-green-400"
        />
        <line
          x1="8"
          y1="0"
          x2="26"
          y2="0"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-green-500 dark:stroke-green-400"
        />
        <line
          x1="20"
          y1="0"
          x2="20"
          y2="6"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-green-500 dark:stroke-green-400"
        />
        <line
          x1="26"
          y1="0"
          x2="26"
          y2="7"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-green-500 dark:stroke-green-400"
        />
      </g>
    </svg>
  )
}

/** Ownership phase — house with shield/checkmark. */
function OwnershipIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* House */}
      <rect
        x="12"
        y="36"
        width="36"
        height="30"
        rx="2"
        className="fill-teal-100 dark:fill-teal-900/50"
      />
      <polygon
        points="8,36 30,16 52,36"
        className="fill-teal-200 dark:fill-teal-800/60"
      />
      {/* Windows */}
      <rect
        x="18"
        y="44"
        width="10"
        height="10"
        rx="1"
        className="fill-white/80 dark:fill-teal-800/60"
      />
      <rect
        x="34"
        y="44"
        width="10"
        height="10"
        rx="1"
        className="fill-white/80 dark:fill-teal-800/60"
      />
      {/* Door */}
      <rect
        x="26"
        y="54"
        width="10"
        height="12"
        rx="2"
        className="fill-teal-300 dark:fill-teal-700/60"
      />
      {/* Shield with checkmark */}
      <path
        d="M 58 22 L 58 42 C 58 52, 48 58, 48 58 C 48 58, 38 52, 38 42 L 38 22 L 48 18 Z"
        className="fill-teal-100 stroke-teal-500 dark:fill-teal-900/40 dark:stroke-teal-400"
        strokeWidth="2"
      />
      <polyline
        points="43,38 47,43 55,32"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-teal-600 dark:stroke-teal-300"
      />
    </svg>
  )
}

/** Rental Setup phase — building with chart. */
function RentalSetupIllustration() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Building */}
      <rect
        x="10"
        y="20"
        width="34"
        height="46"
        rx="2"
        className="fill-emerald-100 dark:fill-emerald-900/50"
      />
      <rect
        x="10"
        y="14"
        width="34"
        height="10"
        rx="2"
        className="fill-emerald-200 dark:fill-emerald-800/60"
      />
      {/* Windows grid */}
      <rect
        x="16"
        y="30"
        width="8"
        height="8"
        rx="1"
        className="fill-white/80 dark:fill-emerald-800/60"
      />
      <rect
        x="30"
        y="30"
        width="8"
        height="8"
        rx="1"
        className="fill-white/80 dark:fill-emerald-800/60"
      />
      <rect
        x="16"
        y="44"
        width="8"
        height="8"
        rx="1"
        className="fill-white/80 dark:fill-emerald-800/60"
      />
      <rect
        x="30"
        y="44"
        width="8"
        height="8"
        rx="1"
        className="fill-white/80 dark:fill-emerald-800/60"
      />
      {/* Door */}
      <rect
        x="22"
        y="56"
        width="10"
        height="10"
        rx="2"
        className="fill-emerald-300 dark:fill-emerald-700/60"
      />
      {/* Chart */}
      <rect
        x="50"
        y="32"
        width="22"
        height="34"
        rx="3"
        className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-900/30 dark:stroke-emerald-700"
        strokeWidth="1.5"
      />
      {/* Bar chart bars */}
      <rect
        x="54"
        y="52"
        width="4"
        height="8"
        rx="1"
        className="fill-emerald-300 dark:fill-emerald-600"
      />
      <rect
        x="60"
        y="46"
        width="4"
        height="14"
        rx="1"
        className="fill-emerald-400 dark:fill-emerald-500"
      />
      <rect
        x="66"
        y="40"
        width="4"
        height="20"
        rx="1"
        className="fill-emerald-500 dark:fill-emerald-400"
      />
      {/* Trend line */}
      <polyline
        points="54,50 60,44 66,38"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-emerald-600 dark:stroke-emerald-300"
      />
    </svg>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export {
  BuyingIllustration,
  ClosingIllustration,
  OwnershipIllustration,
  PreparationIllustration,
  RentalSetupIllustration,
  ResearchIllustration,
}
