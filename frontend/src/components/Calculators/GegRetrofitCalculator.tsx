/**
 * GEG Energy Retrofit Cost Estimator
 * Estimates mandatory energy upgrade costs under the Gebäudeenergiegesetz (GEG)
 * based on a property's Energieausweis energy class and key characteristics.
 */

import { Info, RefreshCw, Zap } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Colors from "@/common/styles/Colors"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"

/******************************************************************************
                              Types
******************************************************************************/

type EnergyClass = "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
type BuildingType = "einfamilienhaus" | "mehrfamilienhaus" | "eigentumswohnung"
type BuildingYearBracket =
  | "pre1950"
  | "1950-1978"
  | "1979-1994"
  | "1995-2009"
  | "2010plus"
type HeatingSystem = "gas" | "oil" | "heatpump" | "district" | "other"

interface CalculatorInputs {
  energyClass: EnergyClass
  sizeSqm: string
  buildingType: BuildingType
  buildingYearBracket: BuildingYearBracket
  heatingSystem: HeatingSystem
}

interface UpgradeEstimate {
  name: string
  mandatoryByYear: number | null
  costMinPerSqm: number
  costMaxPerSqm: number
  subsidyRate: number // fraction 0–1
  source: string
}

interface RetrofitResults {
  upgrades: Array<
    UpgradeEstimate & {
      grossMin: number
      grossMax: number
      netMin: number
      netMax: number
      subsidyAmount: number
    }
  >
  totalGrossMin: number
  totalGrossMax: number
  totalSubsidy: number
  totalNetMin: number
  totalNetMax: number
  monthlyAmortMin: number
  monthlyAmortMax: number
  chartData: Array<{ name: string; gross: number; net: number }>
}

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

// Amortisation period in years (standard for energy upgrades)
const AMORT_YEARS = 20

const DEFAULT_INPUTS: CalculatorInputs = {
  energyClass: "F",
  sizeSqm: "",
  buildingType: "eigentumswohnung",
  buildingYearBracket: "1950-1978",
  heatingSystem: "gas",
}

/**
 * Required upgrades per energy class.
 * Cost data sourced from BDEW, Fraunhofer ISE, dena Renovation Roadmap 2023–2024.
 * BEG subsidy rates as of 2024 federal programme (BAFA/KfW).
 */
const UPGRADE_RULES: Record<
  EnergyClass,
  Array<{
    name: string
    mandatoryByYear: number | null
    costMinPerSqm: number
    costMaxPerSqm: number
    subsidyRate: number
    source: string
    skipForHeating?: HeatingSystem[]
  }>
> = {
  "A+": [],
  A: [],
  B: [],
  C: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
  ],
  D: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Window replacement (double to triple glazing)",
      mandatoryByYear: null,
      costMinPerSqm: 40,
      costMaxPerSqm: 90,
      subsidyRate: 0.15,
      source: "Fraunhofer ISE 2023",
    },
  ],
  E: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Facade insulation (ETICS)",
      mandatoryByYear: null,
      costMinPerSqm: 80,
      costMaxPerSqm: 200,
      subsidyRate: 0.2,
      source: "BDEW 2024, BEG EM",
    },
    {
      name: "Window replacement",
      mandatoryByYear: null,
      costMinPerSqm: 40,
      costMaxPerSqm: 90,
      subsidyRate: 0.15,
      source: "Fraunhofer ISE 2023",
    },
  ],
  F: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Facade insulation (ETICS)",
      mandatoryByYear: null,
      costMinPerSqm: 80,
      costMaxPerSqm: 200,
      subsidyRate: 0.2,
      source: "BDEW 2024, BEG EM",
    },
    {
      name: "Window replacement",
      mandatoryByYear: null,
      costMinPerSqm: 40,
      costMaxPerSqm: 90,
      subsidyRate: 0.15,
      source: "Fraunhofer ISE 2023",
    },
    {
      name: "Heating system upgrade to heat pump",
      mandatoryByYear: 2034,
      costMinPerSqm: 80,
      costMaxPerSqm: 150,
      subsidyRate: 0.35,
      source: "GEG § 71, BEG BEW 2024",
      skipForHeating: ["heatpump", "district"],
    },
  ],
  G: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Facade insulation (ETICS)",
      mandatoryByYear: null,
      costMinPerSqm: 80,
      costMaxPerSqm: 200,
      subsidyRate: 0.2,
      source: "BDEW 2024, BEG EM",
    },
    {
      name: "Basement ceiling insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 15,
      costMaxPerSqm: 40,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Window replacement",
      mandatoryByYear: null,
      costMinPerSqm: 40,
      costMaxPerSqm: 90,
      subsidyRate: 0.15,
      source: "Fraunhofer ISE 2023",
    },
    {
      name: "Heating system upgrade to heat pump",
      mandatoryByYear: 2034,
      costMinPerSqm: 80,
      costMaxPerSqm: 150,
      subsidyRate: 0.35,
      source: "GEG § 71, BEG BEW 2024",
      skipForHeating: ["heatpump", "district"],
    },
  ],
  H: [
    {
      name: "Roof / top floor insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 20,
      costMaxPerSqm: 60,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Facade insulation (ETICS)",
      mandatoryByYear: null,
      costMinPerSqm: 100,
      costMaxPerSqm: 220,
      subsidyRate: 0.2,
      source: "BDEW 2024, BEG EM",
    },
    {
      name: "Basement ceiling insulation",
      mandatoryByYear: 2033,
      costMinPerSqm: 15,
      costMaxPerSqm: 40,
      subsidyRate: 0.2,
      source: "GEG § 47, dena 2024",
    },
    {
      name: "Window replacement",
      mandatoryByYear: null,
      costMinPerSqm: 40,
      costMaxPerSqm: 100,
      subsidyRate: 0.15,
      source: "Fraunhofer ISE 2023",
    },
    {
      name: "Heating system upgrade to heat pump",
      mandatoryByYear: 2034,
      costMinPerSqm: 80,
      costMaxPerSqm: 160,
      subsidyRate: 0.35,
      source: "GEG § 71, BEG BEW 2024",
      skipForHeating: ["heatpump", "district"],
    },
    {
      name: "Electrical infrastructure upgrade",
      mandatoryByYear: null,
      costMinPerSqm: 20,
      costMaxPerSqm: 50,
      subsidyRate: 0.1,
      source: "dena Renovation Roadmap 2023",
    },
  ],
}

// Older buildings have higher per-m² costs due to more complex retrofitting
const AGE_MULTIPLIER: Record<BuildingYearBracket, number> = {
  pre1950: 1.4,
  "1950-1978": 1.25,
  "1979-1994": 1.1,
  "1995-2009": 1,
  "2010plus": 0.85,
}

// Mehrfamilienhaus benefits from scale — lower per-m² cost
const TYPE_MULTIPLIER: Record<BuildingType, number> = {
  einfamilienhaus: 1.1,
  mehrfamilienhaus: 0.85,
  eigentumswohnung: 1,
}

const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  einfamilienhaus: "Single-family house (Einfamilienhaus)",
  mehrfamilienhaus: "Multi-family house (Mehrfamilienhaus)",
  eigentumswohnung: "Apartment / condo (Eigentumswohnung)",
}

const HEATING_LABELS: Record<HeatingSystem, string> = {
  gas: "Gas heating",
  oil: "Oil heating",
  heatpump: "Heat pump (already installed)",
  district: "District heating (Fernwärme)",
  other: "Other / unknown",
}

const YEAR_BRACKET_LABELS: Record<BuildingYearBracket, string> = {
  pre1950: "Pre-1950",
  "1950-1978": "1950–1978",
  "1979-1994": "1979–1994",
  "1995-2009": "1995–2009",
  "2010plus": "2010 or later",
}

const ENERGY_CLASSES: EnergyClass[] = [
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
]

/******************************************************************************
                              Functions
******************************************************************************/

/** Calculate GEG retrofit cost estimates. Returns null when size is missing. */
function calculateGegCosts(inputs: CalculatorInputs): RetrofitResults | null {
  const sizeSqm = Number.parseFloat(inputs.sizeSqm.replace(/[^\d.]/g, "")) || 0
  if (!sizeSqm) return null

  const ageMult = AGE_MULTIPLIER[inputs.buildingYearBracket]
  const typeMult = TYPE_MULTIPLIER[inputs.buildingType]

  const rawUpgrades = UPGRADE_RULES[inputs.energyClass].filter((u) => {
    if (u.skipForHeating?.includes(inputs.heatingSystem)) return false
    return true
  })

  const upgrades = rawUpgrades.map((u) => {
    const adjMin = u.costMinPerSqm * ageMult * typeMult
    const adjMax = u.costMaxPerSqm * ageMult * typeMult
    const grossMin = Math.round(adjMin * sizeSqm)
    const grossMax = Math.round(adjMax * sizeSqm)
    const avgGross = (grossMin + grossMax) / 2
    const subsidyAmount = Math.round(avgGross * u.subsidyRate)
    const netMin = Math.max(0, grossMin - subsidyAmount)
    const netMax = Math.max(0, grossMax - subsidyAmount)
    return { ...u, grossMin, grossMax, netMin, netMax, subsidyAmount }
  })

  const totalGrossMin = upgrades.reduce((s, u) => s + u.grossMin, 0)
  const totalGrossMax = upgrades.reduce((s, u) => s + u.grossMax, 0)
  const totalSubsidy = upgrades.reduce((s, u) => s + u.subsidyAmount, 0)
  const totalNetMin = upgrades.reduce((s, u) => s + u.netMin, 0)
  const totalNetMax = upgrades.reduce((s, u) => s + u.netMax, 0)

  const monthlyAmortMin = Math.round(totalNetMin / (AMORT_YEARS * 12))
  const monthlyAmortMax = Math.round(totalNetMax / (AMORT_YEARS * 12))

  const chartData = upgrades.map((u) => ({
    name: u.name.length > 18 ? `${u.name.slice(0, 18)}…` : u.name,
    gross: Math.round((u.grossMin + u.grossMax) / 2),
    net: Math.round((u.netMin + u.netMax) / 2),
  }))

  return {
    upgrades,
    totalGrossMin,
    totalGrossMax,
    totalSubsidy,
    totalNetMin,
    totalNetMax,
    monthlyAmortMin,
    monthlyAmortMax,
    chartData,
  }
}

/** Map energy class to a severity variant for display. */
function energyClassVariant(
  ec: EnergyClass,
): "success" | "warning" | "danger" | "default" {
  if (ec === "A+" || ec === "A" || ec === "B") return "success"
  if (ec === "C" || ec === "D") return "default"
  if (ec === "E") return "warning"
  return "danger"
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. GEG energy retrofit cost estimator. */
function GegRetrofitCalculator(props: Readonly<IProps>) {
  const { className } = props
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)

  const results = useMemo(() => calculateGegCosts(inputs), [inputs])

  function handleReset() {
    setInputs(DEFAULT_INPUTS)
  }

  const hasUpgrades = results !== null && results.upgrades.length > 0

  function renderResults() {
    if (results === null) {
      return (
        <Card className="flex min-h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Enter property size to see retrofit estimates
          </p>
        </Card>
      )
    }
    if (!hasUpgrades) {
      return (
        <MetricCard
          label={`Energy class ${inputs.energyClass} — no mandatory upgrades`}
          value="€0"
          description="This property meets current GEG standards. No immediate retrofit costs expected."
          variant="success"
        />
      )
    }
    return (
      <>
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Total gross cost (est.)"
            value={`${EUR.format(results.totalGrossMin)}–${EUR.format(results.totalGrossMax)}`}
            description="Before BEG subsidies"
            variant={energyClassVariant(inputs.energyClass)}
          />
          <MetricCard
            label="BEG subsidy (est.)"
            value={EUR.format(results.totalSubsidy)}
            description="Federal BEG programme (BAFA/KfW)"
            variant="success"
          />
          <MetricCard
            label="Net cost after subsidy"
            value={`${EUR.format(results.totalNetMin)}–${EUR.format(results.totalNetMax)}`}
            description="Your estimated out-of-pocket cost"
            variant={energyClassVariant(inputs.energyClass)}
          />
          <MetricCard
            label={`Monthly cost (${AMORT_YEARS}yr amort.)`}
            value={`${EUR.format(results.monthlyAmortMin)}–${EUR.format(results.monthlyAmortMax)}`}
            description="Impact on monthly yield"
            variant="default"
          />
        </div>

        {/* Upgrade list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Required Upgrades</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {results.upgrades.map((u) => (
              <div
                key={u.name}
                className="flex items-start justify-between gap-2 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.mandatoryByYear
                      ? `Mandatory by ${u.mandatoryByYear} · `
                      : "Recommended · "}
                    {Math.round(u.subsidyRate * 100)}% BEG subsidy · {u.source}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium">
                    {EUR.format(u.grossMin)}–{EUR.format(u.grossMax)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    net: {EUR.format(u.netMin)}–{EUR.format(u.netMax)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chart */}
        {results.chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Gross vs. Net Cost per Upgrade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={results.chartData}
                  margin={{ top: 4, right: 8, bottom: 24, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      EUR.format(Number(value)),
                      name === "gross" ? "Gross cost" : "Net (after subsidy)",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "gross" ? "Gross cost" : "Net (after subsidy)"
                    }
                  />
                  <Bar
                    dataKey="gross"
                    fill={Colors.Chart.Amber}
                    radius={[4, 4, 0, 0]}
                    name="gross"
                  />
                  <Bar
                    dataKey="net"
                    fill={Colors.Chart.Blue}
                    radius={[4, 4, 0, 0]}
                    name="net"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Zap className="h-5 w-5 text-amber-500" />
            GEG Energy Retrofit Estimator
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimate mandatory energy upgrade costs under the
            Gebäudeenergiegesetz (GEG — Building Energy Act). Enter the energy
            class from the property's Energieausweis (energy performance
            certificate).
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Details</CardTitle>
            <CardDescription>
              From the Energieausweis and property listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow
              label="Energy class (Energieausweis)"
              tooltip="Found on the Energieausweis — required by law to be provided before sale"
              required
            >
              <Select
                value={inputs.energyClass}
                onValueChange={(v) =>
                  setInputs((p) => ({ ...p, energyClass: v as EnergyClass }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_CLASSES.map((ec) => (
                    <SelectItem key={ec} value={ec}>
                      {ec}
                      {ec === "H" && " (worst)"}
                      {ec === "A+" && " (best)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow
              label="Property size (m²)"
              htmlFor="sizeSqm"
              required
              tooltip="Living area in square metres (Wohnfläche)"
            >
              <Input
                id="sizeSqm"
                type="number"
                min="10"
                placeholder="e.g. 85"
                value={inputs.sizeSqm}
                onChange={(e) =>
                  setInputs((p) => ({ ...p, sizeSqm: e.target.value }))
                }
              />
            </FormRow>

            <FormRow label="Building type" tooltip="Affects cost per m²">
              <Select
                value={inputs.buildingType}
                onValueChange={(v) =>
                  setInputs((p) => ({
                    ...p,
                    buildingType: v as BuildingType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(BUILDING_TYPE_LABELS) as Array<
                      [BuildingType, string]
                    >
                  ).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow
              label="Building year"
              tooltip="Older buildings have higher retrofit complexity and cost"
            >
              <Select
                value={inputs.buildingYearBracket}
                onValueChange={(v) =>
                  setInputs((p) => ({
                    ...p,
                    buildingYearBracket: v as BuildingYearBracket,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(YEAR_BRACKET_LABELS) as Array<
                      [BuildingYearBracket, string]
                    >
                  ).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow
              label="Current heating system"
              tooltip="Heat pump and district heating may be exempt from GEG § 71 mandate"
            >
              <Select
                value={inputs.heatingSystem}
                onValueChange={(v) =>
                  setInputs((p) => ({
                    ...p,
                    heatingSystem: v as HeatingSystem,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(HEATING_LABELS) as Array<
                      [HeatingSystem, string]
                    >
                  ).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">{renderResults()}</div>
      </div>

      {/* Educational section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Key GEG Deadlines & Subsidies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">
                GEG § 47 — Insulation mandate
              </p>
              <p>
                Roofs, top floors, and basement ceilings of older buildings must
                meet minimum insulation standards by{" "}
                <strong>January 2033</strong>.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">
                GEG § 71 — Heating mandate
              </p>
              <p>
                New heating installations from 2024 must be at least 65%
                renewable energy. Gas and oil boiler replacements trigger the
                heat pump requirement by <strong>2034</strong>.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">
                BEG Subsidies (BAFA/KfW)
              </p>
              <p>
                Federal BEG programme: up to <strong>35%</strong> for heat
                pumps, <strong>20%</strong> for insulation. Apply before
                ordering works — retrospective claims not accepted.
              </p>
            </div>
          </div>
          <p className="text-xs">
            Sources: GEG 2024 (BGBl. I Nr. 48), BDEW Energy Efficiency Report
            2024, Fraunhofer ISE Cost Study 2023, dena Renovation Roadmap 2023,
            BEG programme guide 2024 (BAFA).
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Estimates based on published cost ranges — actual costs depend on
        building condition, local labour markets, and contractor quotes.
        Commission a certified Energieberater (energy consultant) for a binding
        assessment before purchase.
      </p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GegRetrofitCalculator }
export default GegRetrofitCalculator
