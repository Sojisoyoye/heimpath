/******************************************************************************
                              Components
******************************************************************************/

/** Decorative SVG illustration of a stylized German property scene. */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 360"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Ground line */}
      <rect
        x="0"
        y="300"
        width="400"
        height="60"
        rx="8"
        className="fill-blue-100/60 dark:fill-blue-900/30"
      />

      {/* Background building — left Altbau */}
      <rect
        x="30"
        y="150"
        width="70"
        height="150"
        rx="2"
        className="fill-blue-200/40 dark:fill-blue-800/40"
      />
      <rect
        x="30"
        y="140"
        width="70"
        height="14"
        rx="2"
        className="fill-blue-300/40 dark:fill-blue-700/40"
      />
      {/* Altbau windows */}
      <rect
        x="42"
        y="170"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="72"
        y="170"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="42"
        y="210"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="72"
        y="210"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="42"
        y="250"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="72"
        y="250"
        width="14"
        height="18"
        rx="7"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />

      {/* Background building — right apartment */}
      <rect
        x="310"
        y="120"
        width="65"
        height="180"
        rx="2"
        className="fill-blue-200/40 dark:fill-blue-800/40"
      />
      <rect
        x="310"
        y="112"
        width="65"
        height="12"
        rx="2"
        className="fill-blue-300/40 dark:fill-blue-700/40"
      />
      {/* Apartment windows */}
      <rect
        x="320"
        y="138"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="350"
        y="138"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="320"
        y="170"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="350"
        y="170"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="320"
        y="202"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="350"
        y="202"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="320"
        y="234"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="350"
        y="234"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="320"
        y="266"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />
      <rect
        x="350"
        y="266"
        width="12"
        height="16"
        rx="2"
        className="fill-blue-100/60 dark:fill-blue-900/40"
      />

      {/* Dashed path — "HeimPath" metaphor */}
      <path
        d="M 60 340 C 120 320, 140 280, 200 270"
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="8 6"
        strokeLinecap="round"
        className="stroke-blue-400 dark:stroke-blue-500"
      />

      {/* Stepping stones along the path */}
      <circle
        cx="80"
        cy="332"
        r="4"
        className="fill-blue-300/60 dark:fill-blue-600/60"
      />
      <circle
        cx="120"
        cy="312"
        r="4"
        className="fill-blue-300/60 dark:fill-blue-600/60"
      />
      <circle
        cx="158"
        cy="286"
        r="4"
        className="fill-blue-300/60 dark:fill-blue-600/60"
      />

      {/* Central house — walls */}
      <rect
        x="150"
        y="200"
        width="100"
        height="100"
        rx="2"
        className="fill-blue-100 dark:fill-blue-900/60"
      />

      {/* Central house — roof */}
      <polygon points="140,200 200,145 260,200" className="fill-blue-600" />

      {/* Chimney */}
      <rect
        x="225"
        y="155"
        width="14"
        height="30"
        rx="2"
        className="fill-blue-500"
      />

      {/* Central house — door */}
      <rect
        x="186"
        y="256"
        width="28"
        height="44"
        rx="3"
        className="fill-purple-500"
      />
      <circle cx="208" cy="280" r="2.5" className="fill-purple-300" />

      {/* Central house — windows */}
      <rect
        x="160"
        y="216"
        width="22"
        height="22"
        rx="2"
        className="fill-white/80 dark:fill-blue-800/60"
      />
      <rect
        x="218"
        y="216"
        width="22"
        height="22"
        rx="2"
        className="fill-white/80 dark:fill-blue-800/60"
      />
      <line
        x1="171"
        y1="216"
        x2="171"
        y2="238"
        strokeWidth="1.5"
        className="stroke-blue-300/60 dark:stroke-blue-600/60"
      />
      <line
        x1="160"
        y1="227"
        x2="182"
        y2="227"
        strokeWidth="1.5"
        className="stroke-blue-300/60 dark:stroke-blue-600/60"
      />
      <line
        x1="229"
        y1="216"
        x2="229"
        y2="238"
        strokeWidth="1.5"
        className="stroke-blue-300/60 dark:stroke-blue-600/60"
      />
      <line
        x1="218"
        y1="227"
        x2="240"
        y2="227"
        strokeWidth="1.5"
        className="stroke-blue-300/60 dark:stroke-blue-600/60"
      />

      {/* Key motif — lower right */}
      <g transform="translate(290, 260) rotate(-30)">
        {/* Key head — ring */}
        <circle
          cx="0"
          cy="0"
          r="12"
          fill="none"
          strokeWidth="3.5"
          className="stroke-blue-600 dark:stroke-blue-400"
        />
        {/* Key shaft */}
        <line
          x1="12"
          y1="0"
          x2="42"
          y2="0"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="stroke-blue-600 dark:stroke-blue-400"
        />
        {/* Key teeth */}
        <line
          x1="34"
          y1="0"
          x2="34"
          y2="8"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-blue-600 dark:stroke-blue-400"
        />
        <line
          x1="42"
          y1="0"
          x2="42"
          y2="10"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-blue-600 dark:stroke-blue-400"
        />
      </g>

      {/* Euro sign accent */}
      <g transform="translate(120, 130)">
        <circle
          cx="0"
          cy="0"
          r="16"
          className="fill-purple-100/60 dark:fill-purple-900/40"
        />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          className="fill-purple-400"
        >
          €
        </text>
      </g>

      {/* Document icon accent */}
      <g transform="translate(320, 80)">
        <rect
          x="-10"
          y="-14"
          width="20"
          height="28"
          rx="3"
          className="fill-blue-100/60 dark:fill-blue-900/40"
        />
        <line
          x1="-5"
          y1="-5"
          x2="5"
          y2="-5"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-blue-400"
        />
        <line
          x1="-5"
          y1="1"
          x2="5"
          y2="1"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-blue-400"
        />
        <line
          x1="-5"
          y1="7"
          x2="2"
          y2="7"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-blue-400"
        />
      </g>
    </svg>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HeroIllustration }
