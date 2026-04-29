/**
 * Journey Progress Ring Chart
 * Donut chart showing per-phase completion with overall percentage in center.
 */

import { JOURNEY_PHASES } from "@/common/constants"
import Colors from "@/common/styles/Colors"

interface PhaseData {
  total: number
  completed: number
}

interface IProps {
  phases: Record<string, PhaseData>
  overallPercentage: number
  size?: number
  startedAt?: string | null
  totalEstimatedDays?: number | null
}

/******************************************************************************
                              Constants
******************************************************************************/

const STROKE_WIDTH = 10
const ARC_GAP = 4

const PHASE_CHART_COLORS: Record<string, { stroke: string; bg: string }> = {
  research: { stroke: Colors.Journey.Research, bg: "#dbeafe" },
  preparation: { stroke: Colors.Journey.Preparation, bg: "#f3e8ff" },
  buying: { stroke: Colors.Journey.Buying, bg: "#ffedd5" },
  closing: { stroke: Colors.Journey.Closing, bg: "#dcfce7" },
  ownership: { stroke: Colors.Journey.Ownership, bg: "#fef3c7" },
  rental_setup: { stroke: Colors.Journey.RentalSetup, bg: "#ccfbf1" },
  rental_search: { stroke: Colors.Journey.RentalSearch, bg: "#e0e7ff" },
  rental_application: {
    stroke: Colors.Journey.RentalApplication,
    bg: "#cffafe",
  },
  rental_contract: { stroke: Colors.Journey.RentalContract, bg: "#ffe4e6" },
  rental_move_in: { stroke: Colors.Journey.RentalMoveIn, bg: "#d1fae5" },
}

const DEFAULT_COLOR = { stroke: "#6b7280", bg: "#f3f4f6" }

/******************************************************************************
                              Components
******************************************************************************/

/** Single ring arc for a phase. */
function PhaseArc(props: {
  cx: number
  cy: number
  radius: number
  strokeWidth: number
  percentage: number
  offset: number
  circumference: number
  color: string
  bgColor: string
}) {
  const { cx, cy, radius, strokeWidth, percentage, offset, circumference } =
    props
  const dashLength = (percentage / 100) * circumference
  const gapLength = circumference - dashLength

  return (
    <g>
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={props.bgColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className="opacity-40 dark:opacity-20"
      />
      {/* Filled arc */}
      {dashLength > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={props.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
      )}
    </g>
  )
}

/** Number of whole days elapsed since a UTC ISO date string. */
function daysSince(isoDate: string): number {
  const start = new Date(isoDate)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/** Default component. Donut chart with per-phase arcs. */
function JourneyRingChart(props: Readonly<IProps>) {
  const {
    phases,
    overallPercentage,
    size = 160,
    startedAt,
    totalEstimatedDays,
  } = props

  const dayNumber =
    startedAt != null ? Math.max(1, daysSince(startedAt) + 1) : null
  const showDayLabel = dayNumber != null && totalEstimatedDays != null

  const cx = size / 2
  const cy = size / 2
  const outerRadius = size / 2 - STROKE_WIDTH / 2 - 2

  // Build ordered phase entries that exist in the data
  const phaseEntries = JOURNEY_PHASES.filter((p) => phases[p.key] != null).map(
    (p) => ({
      key: p.key,
      label: p.label,
      ...phases[p.key],
    }),
  )

  const phaseCount = phaseEntries.length
  if (phaseCount === 0) return null

  // Each phase gets an equal arc segment of the circle
  const totalCircumference = 2 * Math.PI * outerRadius
  const gapTotal = phaseCount * ARC_GAP
  const availableArc = totalCircumference - gapTotal
  const arcPerPhase = availableArc / phaseCount

  // Pre-compute offsets to avoid mutable state in render
  const offsets = phaseEntries.map((_, i) => i * (arcPerPhase + ARC_GAP))

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {phaseEntries.map((phase, idx) => {
            const colors = PHASE_CHART_COLORS[phase.key] ?? DEFAULT_COLOR
            const phasePercentage =
              phase.total > 0 ? (phase.completed / phase.total) * 100 : 0
            const filledLength = (phasePercentage / 100) * arcPerPhase
            const fillPct =
              totalCircumference > 0
                ? (filledLength / totalCircumference) * 100
                : 0

            return (
              <PhaseArc
                key={phase.key}
                cx={cx}
                cy={cy}
                radius={outerRadius}
                strokeWidth={STROKE_WIDTH}
                percentage={fillPct}
                offset={offsets[idx]}
                circumference={totalCircumference}
                color={colors.stroke}
                bgColor={colors.bg}
              />
            )
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">
            {Math.round(overallPercentage)}%
          </span>
          <span className="text-xs text-muted-foreground">Complete</span>
          {showDayLabel && (
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              Day {dayNumber} of {totalEstimatedDays}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {phaseEntries.map((phase) => {
          const colors = PHASE_CHART_COLORS[phase.key] ?? DEFAULT_COLOR
          return (
            <div key={phase.key} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors.stroke }}
              />
              <span className="text-muted-foreground">
                {phase.label}{" "}
                <span className="font-medium text-foreground">
                  {phase.completed}/{phase.total}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneyRingChart
