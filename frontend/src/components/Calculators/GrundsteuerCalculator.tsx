/**
 * Grundsteuer Calculator (Annual Property Tax)
 * Estimates German annual property tax under the 2025 reform across all three
 * state models: Federal (Bundesmodell), Bavaria (Flächenmodell), and
 * Baden-Württemberg (Bodenwertmodell).
 */

import { Home, RefreshCw } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Disclaimer } from "@/components/ui/disclaimer"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"

/******************************************************************************
                              Types
******************************************************************************/

type StateModel = "federal" | "bavaria" | "bw"
type PropertyType = "efh" | "zwf" | "wohnung" | "other"

interface CalculatorInputs {
  /** Federal state key e.g. "BY", "BW", "BE" */
  state: string
  propertyType: PropertyType
  /** Federal/BW: official Grundsteuerwert (€) */
  grundsteuerwert: string
  /** Bavaria: living area in sqm */
  livingArea: string
  /** Bavaria: land area in sqm */
  landArea: string
  /** BW: land area in sqm */
  bwLandArea: string
  /** BW: Bodenrichtwert in €/sqm */
  bodenrichtwert: string
  /** Municipality Hebesatz in % */
  hebesatz: string
  /** Optional: purchase price for cost-ratio metric */
  purchasePrice: string
}

interface CalculationResults {
  grundsteuerwert: number
  steuermesszahl: number
  grundsteuermessbetrag: number
  hebesatz: number
  annualTax: number
  quarterlyTax: number
  monthlyTax: number
  /** Ratio to purchase price, or null if not provided */
  ratioToPurchasePrice: number | null
  /** Model used for display */
  modelLabel: string
  /** Scenario bars for city comparison chart */
  cityComparison: Array<{ city: string; hebesatz: number; annualTax: number }>
}

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const CURRENCY_DECIMAL_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** German federal states with their model type and Steuermesszahl (‰) */
const STATES: Array<{
  key: string
  label: string
  model: StateModel
  /** Steuermesszahl in ‰ for residential (federal/BW only) */
  messzahl: number
}> = [
  { key: "BW", label: "Baden-Württemberg", model: "bw", messzahl: 1.3 },
  { key: "BY", label: "Bavaria (Bayern)", model: "bavaria", messzahl: 0 },
  { key: "BE", label: "Berlin", model: "federal", messzahl: 0.31 },
  { key: "BB", label: "Brandenburg", model: "federal", messzahl: 0.31 },
  { key: "HB", label: "Bremen", model: "federal", messzahl: 0.31 },
  { key: "HH", label: "Hamburg", model: "federal", messzahl: 0.31 },
  { key: "HE", label: "Hessen", model: "federal", messzahl: 0.31 },
  {
    key: "MV",
    label: "Mecklenburg-Vorpommern",
    model: "federal",
    messzahl: 0.31,
  },
  { key: "NI", label: "Niedersachsen", model: "federal", messzahl: 0.34 },
  {
    key: "NW",
    label: "North Rhine-Westphalia (NRW)",
    model: "federal",
    messzahl: 0.31,
  },
  {
    key: "RP",
    label: "Rhineland-Palatinate",
    model: "federal",
    messzahl: 0.31,
  },
  { key: "SL", label: "Saarland", model: "federal", messzahl: 0.64 },
  { key: "SN", label: "Saxony (Sachsen)", model: "federal", messzahl: 0.36 },
  { key: "ST", label: "Saxony-Anhalt", model: "federal", messzahl: 0.31 },
  { key: "SH", label: "Schleswig-Holstein", model: "federal", messzahl: 0.31 },
  {
    key: "TH",
    label: "Thuringia (Thüringen)",
    model: "federal",
    messzahl: 0.31,
  },
]

/** Major city Hebesatz presets (%) — 2024/2025 values */
const CITY_PRESETS: Record<
  string,
  Array<{ city: string; hebesatz: number }>
> = {
  BW: [
    { city: "Stuttgart", hebesatz: 520 },
    { city: "Mannheim", hebesatz: 600 },
    { city: "Karlsruhe", hebesatz: 580 },
    { city: "Freiburg", hebesatz: 600 },
  ],
  BY: [
    { city: "Munich", hebesatz: 535 },
    { city: "Nuremberg", hebesatz: 625 },
    { city: "Augsburg", hebesatz: 555 },
    { city: "Regensburg", hebesatz: 505 },
  ],
  BE: [{ city: "Berlin", hebesatz: 810 }],
  BB: [
    { city: "Potsdam", hebesatz: 565 },
    { city: "Cottbus", hebesatz: 545 },
  ],
  HB: [{ city: "Bremen", hebesatz: 695 }],
  HH: [{ city: "Hamburg", hebesatz: 750 }],
  HE: [
    { city: "Frankfurt", hebesatz: 660 },
    { city: "Wiesbaden", hebesatz: 560 },
    { city: "Kassel", hebesatz: 600 },
  ],
  MV: [
    { city: "Rostock", hebesatz: 550 },
    { city: "Schwerin", hebesatz: 540 },
  ],
  NI: [
    { city: "Hanover", hebesatz: 600 },
    { city: "Braunschweig", hebesatz: 580 },
  ],
  NW: [
    { city: "Cologne", hebesatz: 675 },
    { city: "Düsseldorf", hebesatz: 550 },
    { city: "Dortmund", hebesatz: 610 },
    { city: "Essen", hebesatz: 670 },
  ],
  RP: [
    { city: "Mainz", hebesatz: 530 },
    { city: "Koblenz", hebesatz: 490 },
  ],
  SL: [{ city: "Saarbrücken", hebesatz: 570 }],
  SN: [
    { city: "Leipzig", hebesatz: 650 },
    { city: "Dresden", hebesatz: 620 },
    { city: "Chemnitz", hebesatz: 600 },
  ],
  ST: [{ city: "Magdeburg", hebesatz: 530 }],
  SH: [
    { city: "Kiel", hebesatz: 545 },
    { city: "Lübeck", hebesatz: 580 },
  ],
  TH: [
    { city: "Erfurt", hebesatz: 575 },
    { city: "Jena", hebesatz: 555 },
  ],
}

/** Steuermesszahl for Eigentumswohnung is slightly higher in federal model */
const WOHNUNG_MESSZAHL_FEDERAL = 0.34

const DEFAULT_INPUTS: CalculatorInputs = {
  state: "BY",
  propertyType: "wohnung",
  grundsteuerwert: "",
  livingArea: "",
  landArea: "",
  bwLandArea: "",
  bodenrichtwert: "",
  hebesatz: "535",
  purchasePrice: "",
}

/******************************************************************************
                              Functions
******************************************************************************/

function parseNumber(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.-]/g, "")) || 0
}

const BAVARIA = STATES.find((s) => s.key === "BY") ?? STATES[0]

function getStateInfo(stateKey: string) {
  return STATES.find((s) => s.key === stateKey) ?? BAVARIA
}

/**
 * Bavaria Flächenmodell:
 *   Äquivalenzbetrag (building) = min(area, 100) × 0.04 + max(0, area-100) × 0.02
 *   Äquivalenzbetrag (land)     = min(area, 500) × 0.02 + max(0, area-500) × 0.01
 *   Grundsteuermessbetrag       = (äqB + äqL) × 1.0  (Messzahl = 100%)
 *   Annual tax                  = Grundsteuermessbetrag × Hebesatz / 100
 */
function calcBavaria(
  livingArea: number,
  landArea: number,
  hebesatz: number,
): Pick<
  CalculationResults,
  "grundsteuerwert" | "steuermesszahl" | "grundsteuermessbetrag" | "annualTax"
> {
  const aqBuilding =
    Math.min(livingArea, 100) * 0.04 + Math.max(0, livingArea - 100) * 0.02
  const aqLand =
    Math.min(landArea, 500) * 0.02 + Math.max(0, landArea - 500) * 0.01
  const messbetrag = aqBuilding + aqLand
  return {
    grundsteuerwert: 0,
    steuermesszahl: 1.0,
    grundsteuermessbetrag: messbetrag,
    annualTax: (messbetrag * hebesatz) / 100,
  }
}

/**
 * Baden-Württemberg Bodenwertmodell:
 *   Grundsteuerwert = land_area × bodenrichtwert × 1.0
 *   Steuermesszahl  = 1.3‰
 *   Messbetrag      = Grundsteuerwert × 1.3 / 1000
 *   Annual tax      = Messbetrag × Hebesatz / 100
 */
function calcBW(
  landArea: number,
  bodenrichtwert: number,
  hebesatz: number,
): Pick<
  CalculationResults,
  "grundsteuerwert" | "steuermesszahl" | "grundsteuermessbetrag" | "annualTax"
> {
  const gwert = landArea * bodenrichtwert
  const messzahl = 1.3
  const messbetrag = (gwert * messzahl) / 1000
  return {
    grundsteuerwert: gwert,
    steuermesszahl: messzahl,
    grundsteuermessbetrag: messbetrag,
    annualTax: (messbetrag * hebesatz) / 100,
  }
}

/**
 * Federal model (Bundesmodell — 14 states):
 *   Steuermesszahl = 0.34‰ for Wohnung, 0.31‰ (or state-specific) for others
 *   Messbetrag     = Grundsteuerwert × Messzahl / 1000
 *   Annual tax     = Messbetrag × Hebesatz / 100
 */
function calcFederal(
  grundsteuerwert: number,
  propertyType: PropertyType,
  stateMesszahl: number,
  hebesatz: number,
): Pick<
  CalculationResults,
  "grundsteuerwert" | "steuermesszahl" | "grundsteuermessbetrag" | "annualTax"
> {
  const messzahl =
    propertyType === "wohnung" ? WOHNUNG_MESSZAHL_FEDERAL : stateMesszahl
  const messbetrag = (grundsteuerwert * messzahl) / 1000
  return {
    grundsteuerwert,
    steuermesszahl: messzahl,
    grundsteuermessbetrag: messbetrag,
    annualTax: (messbetrag * hebesatz) / 100,
  }
}

function modelLabel(model: StateModel): string {
  if (model === "bavaria") return "Bavaria Flächenmodell"
  if (model === "bw") return "BW Bodenwertmodell"
  return "Bundesmodell (Federal)"
}

/** Build city comparison bars from the state's city presets. */
function buildCityComparison(
  stateKey: string,
  messbetrag: number,
): CalculationResults["cityComparison"] {
  const presets = CITY_PRESETS[stateKey] ?? []
  // messbetrag is model-agnostic: it encodes all area/value inputs, so the
  // same formula applies regardless of whether the state uses the federal,
  // Bavaria, or BW model.
  return presets.map((p) => ({
    city: p.city,
    hebesatz: p.hebesatz,
    annualTax: (messbetrag * p.hebesatz) / 100,
  }))
}

/** Main calculation — returns null when required inputs are missing. */
function calculateGrundsteuer(
  inputs: CalculatorInputs,
): CalculationResults | null {
  const stateInfo = getStateInfo(inputs.state)
  const hebesatz = parseNumber(inputs.hebesatz)
  if (hebesatz <= 0) return null

  let core: Pick<
    CalculationResults,
    "grundsteuerwert" | "steuermesszahl" | "grundsteuermessbetrag" | "annualTax"
  > | null = null

  if (stateInfo.model === "bavaria") {
    const living = parseNumber(inputs.livingArea)
    const land = parseNumber(inputs.landArea)
    if (living <= 0) return null
    core = calcBavaria(living, land, hebesatz)
  } else if (stateInfo.model === "bw") {
    const bwLand = parseNumber(inputs.bwLandArea)
    const boden = parseNumber(inputs.bodenrichtwert)
    if (bwLand <= 0 || boden <= 0) return null
    core = calcBW(bwLand, boden, hebesatz)
  } else {
    const gwert = parseNumber(inputs.grundsteuerwert)
    if (gwert <= 0) return null
    core = calcFederal(gwert, inputs.propertyType, stateInfo.messzahl, hebesatz)
  }

  if (!core) return null

  const purchase = parseNumber(inputs.purchasePrice)
  const ratioToPurchasePrice = purchase > 0 ? core.annualTax / purchase : null

  const cityComparison = buildCityComparison(
    inputs.state,
    core.grundsteuermessbetrag,
  )

  return {
    ...core,
    hebesatz,
    quarterlyTax: core.annualTax / 4,
    monthlyTax: core.annualTax / 12,
    ratioToPurchasePrice,
    modelLabel: modelLabel(stateInfo.model),
    cityComparison,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Badge showing which Grundsteuer model applies to the selected state. */
function ModelBadge(props: Readonly<{ label: string }>) {
  const { label } = props
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-3 py-1">
      <Home className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
        {label}
      </span>
    </div>
  )
}

/** City Hebesatz comparison bar chart. */
function CityComparisonChart(
  props: Readonly<{
    data: CalculationResults["cityComparison"]
    selectedHebesatz: number
  }>,
) {
  const { data, selectedHebesatz } = props
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="city" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => CURRENCY_FORMATTER.format(v)}
        />
        <Tooltip
          formatter={(value) => [
            CURRENCY_DECIMAL_FORMATTER.format(Number(value)),
            "Annual Tax",
          ]}
        />
        <Bar dataKey="annualTax" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.city}
              fill={
                entry.hebesatz === selectedHebesatz
                  ? Colors.Chart.Blue
                  : Colors.Chart.Purple
              }
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Input fields that vary by state model. */
function ModelInputs(
  props: Readonly<{
    inputs: CalculatorInputs
    stateModel: StateModel
    onUpdate: (key: keyof CalculatorInputs, value: string) => void
  }>,
) {
  const { inputs, stateModel, onUpdate } = props

  if (stateModel === "bavaria") {
    return (
      <>
        <FormRow
          htmlFor="livingArea"
          label="Living Area (sqm)"
          tooltip="Wohnfläche in square metres as stated in the property listing."
        >
          <Input
            id="livingArea"
            type="number"
            min="1"
            step="1"
            placeholder="80"
            value={inputs.livingArea}
            onChange={(e) => onUpdate("livingArea", e.target.value)}
          />
        </FormRow>
        <FormRow
          htmlFor="landArea"
          label="Land Area (sqm)"
          optional
          tooltip="Grundstücksfläche (plot area). Enter 0 for apartments with no private land share."
        >
          <Input
            id="landArea"
            type="number"
            min="0"
            step="1"
            placeholder="200"
            value={inputs.landArea}
            onChange={(e) => onUpdate("landArea", e.target.value)}
          />
        </FormRow>
      </>
    )
  }

  if (stateModel === "bw") {
    return (
      <>
        <FormRow
          htmlFor="bwLandArea"
          label="Land Area (sqm)"
          tooltip="Grundstücksfläche (plot area) from the Grundbuch (land registry) or listing. For condos use your share of the total land area (Miteigentumsanteil × Gesamtfläche)."
        >
          <Input
            id="bwLandArea"
            type="number"
            min="1"
            step="1"
            placeholder="300"
            value={inputs.bwLandArea}
            onChange={(e) => onUpdate("bwLandArea", e.target.value)}
          />
        </FormRow>
        <FormRow
          htmlFor="bodenrichtwert"
          label="Bodenrichtwert (Standard Land Value, €/sqm)"
          tooltip="Official standard land value for your area, published by the Gutachterausschuss (Expert Valuation Committee). Look it up at boris-bw.de."
        >
          <Input
            id="bodenrichtwert"
            type="number"
            min="1"
            step="1"
            placeholder="500"
            value={inputs.bodenrichtwert}
            onChange={(e) => onUpdate("bodenrichtwert", e.target.value)}
          />
        </FormRow>
      </>
    )
  }

  // Federal model
  return (
    <FormRow
      htmlFor="grundsteuerwert"
      label="Grundsteuerwert (€)"
      tooltip="The assessed value set by your Finanzamt (tax office) in your Grundsteuerwertbescheid. For new buyers, this is typically 10–30% of the market purchase price."
    >
      <Input
        id="grundsteuerwert"
        type="number"
        min="1"
        step="100"
        placeholder="50000"
        value={inputs.grundsteuerwert}
        onChange={(e) => onUpdate("grundsteuerwert", e.target.value)}
      />
    </FormRow>
  )
}

/** Default component. Annual property tax calculator (Grundsteuer). */
function GrundsteuerCalculator({ className }: Readonly<IProps>) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)

  const stateInfo = useMemo(() => getStateInfo(inputs.state), [inputs.state])
  const results = useMemo(() => calculateGrundsteuer(inputs), [inputs])

  const updateInput = useCallback(
    (key: keyof CalculatorInputs, value: string) => {
      setInputs((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleStateChange = useCallback((value: string) => {
    const presets = CITY_PRESETS[value]
    const defaultHebesatz =
      presets && presets.length > 0 ? String(presets[0].hebesatz) : "500"
    setInputs((prev) => ({
      ...prev,
      state: value,
      hebesatz: defaultHebesatz,
      // Clear model-specific fields on state change
      grundsteuerwert: "",
      livingArea: "",
      landArea: "",
      bwLandArea: "",
      bodenrichtwert: "",
    }))
  }, [])

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS)
  }, [])

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Grundsteuer Calculator
            </CardTitle>
            <CardDescription>
              Estimate annual German property tax after the 2025 Grundsteuer
              reform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location & Model */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Location
              </h4>
              <FormRow htmlFor="state" label="Federal State">
                <Select value={inputs.state} onValueChange={handleStateChange}>
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              <ModelBadge
                label={
                  stateInfo.model === "bavaria"
                    ? "Bavaria Flächenmodell (area-based)"
                    : stateInfo.model === "bw"
                      ? "BW Bodenwertmodell (land value)"
                      : `Bundesmodell — ${stateInfo.messzahl}‰ Steuermesszahl`
                }
              />

              {stateInfo.model === "federal" && (
                <FormRow htmlFor="propertyType" label="Property Type">
                  <Select
                    value={inputs.propertyType}
                    onValueChange={(v) => updateInput("propertyType", v)}
                  >
                    <SelectTrigger id="propertyType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wohnung">
                        Eigentumswohnung (Condo)
                      </SelectItem>
                      <SelectItem value="efh">
                        Einfamilienhaus (Detached House)
                      </SelectItem>
                      <SelectItem value="zwf">
                        Zweifamilienhaus (Semi-Detached)
                      </SelectItem>
                      <SelectItem value="other">Other Residential</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
              )}
            </div>

            <Separator />

            {/* Model-Specific Inputs */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Property Details
              </h4>
              <ModelInputs
                inputs={inputs}
                stateModel={stateInfo.model}
                onUpdate={updateInput}
              />
            </div>

            <Separator />

            {/* Hebesatz */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Municipality
              </h4>
              <FormRow
                htmlFor="hebesatz"
                label="Hebesatz (%)"
                tooltip="The municipal multiplier set by your Gemeinde. Ranges from ~250% (rural) to 1050%+ (some cities). Check your local authority's website."
              >
                <Input
                  id="hebesatz"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="535"
                  value={inputs.hebesatz}
                  onChange={(e) => updateInput("hebesatz", e.target.value)}
                />
              </FormRow>

              {/* City preset buttons */}
              {CITY_PRESETS[inputs.state] && (
                <div className="flex flex-wrap gap-2">
                  {CITY_PRESETS[inputs.state].map((p) => (
                    <button
                      key={p.city}
                      type="button"
                      onClick={() =>
                        updateInput("hebesatz", String(p.hebesatz))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        inputs.hebesatz === String(p.hebesatz)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground",
                      )}
                    >
                      {p.city} {p.hebesatz}%
                    </button>
                  ))}
                </div>
              )}

              <FormRow
                htmlFor="purchasePrice"
                label="Purchase Price"
                optional
                tooltip="Enter to see Grundsteuer as a % of property value."
              >
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="400000"
                  value={inputs.purchasePrice}
                  onChange={(e) => updateInput("purchasePrice", e.target.value)}
                />
              </FormRow>
            </div>

            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Estimate</CardTitle>
            <CardDescription>
              Annual Grundsteuer B based on your inputs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Annual Grundsteuer"
                    value={CURRENCY_DECIMAL_FORMATTER.format(results.annualTax)}
                    description="Grundsteuer B per year"
                    variant="warning"
                  />
                  <MetricCard
                    label="Quarterly Payment"
                    value={CURRENCY_DECIMAL_FORMATTER.format(
                      results.quarterlyTax,
                    )}
                    description="Due 15 Feb / May / Aug / Nov"
                  />
                  <MetricCard
                    label="Monthly Equivalent"
                    value={CURRENCY_DECIMAL_FORMATTER.format(
                      results.monthlyTax,
                    )}
                    description="Budget planning reference"
                  />
                  {results.ratioToPurchasePrice !== null ? (
                    <MetricCard
                      label="% of Purchase Price"
                      value={`${(results.ratioToPurchasePrice * 100).toFixed(3)}%`}
                      description="Annual tax as share of property value"
                    />
                  ) : (
                    <MetricCard
                      label="Germany Average"
                      value="~€700 / year"
                      description="Typical residential property (approx.)"
                    />
                  )}
                </div>

                <Separator />

                {/* Calculation Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Calculation Breakdown</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    {stateInfo.model === "bavaria" ? (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Äquivalenzbetrag (building + land)</span>
                          <span>
                            €{results.grundsteuermessbetrag.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Hebesatz</span>
                          <span>{results.hebesatz}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Grundsteuerwert</span>
                          <span>
                            {CURRENCY_FORMATTER.format(results.grundsteuerwert)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Steuermesszahl</span>
                          <span>{results.steuermesszahl}‰</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Grundsteuermessbetrag</span>
                          <span>
                            €{results.grundsteuermessbetrag.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Hebesatz</span>
                          <span>{results.hebesatz}%</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Annual Grundsteuer</span>
                      <span className="text-amber-600">
                        {CURRENCY_DECIMAL_FORMATTER.format(results.annualTax)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Model Info */}
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State Model</span>
                    <span className="font-medium">{results.modelLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Schedule
                    </span>
                    <span>4× per year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reform</span>
                    <span>Grundsteuerreform 2025</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {stateInfo.model === "bavaria"
                    ? "Enter the Living Area to see your estimate"
                    : stateInfo.model === "bw"
                      ? "Enter Land Area and Bodenrichtwert to see your estimate"
                      : "Enter the Grundsteuerwert to see your estimate"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Results update automatically as you type
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* City Comparison Chart */}
      {results && results.cityComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hebesatz Comparison — Major Cities</CardTitle>
            <CardDescription>
              Annual Grundsteuer for your property across major cities in{" "}
              {stateInfo.label} — highlighted bar matches your selected Hebesatz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CityComparisonChart
              data={results.cityComparison}
              selectedHebesatz={results.hebesatz}
            />

            <Separator />

            {/* Hebesatz Reference Table */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                City Reference Table
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-medium">City</th>
                      <th className="py-2 text-right font-medium">
                        Hebesatz (%)
                      </th>
                      <th className="py-2 text-right font-medium">
                        Annual Tax
                      </th>
                      <th className="py-2 text-right font-medium">Per Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.cityComparison.map((row) => (
                      <tr
                        key={row.city}
                        className={cn(
                          "border-b",
                          row.hebesatz === results.hebesatz &&
                            "bg-blue-50 dark:bg-blue-950/20 font-medium",
                        )}
                      >
                        <td className="py-2">{row.city}</td>
                        <td className="py-2 text-right">{row.hebesatz}%</td>
                        <td className="py-2 text-right">
                          {CURRENCY_DECIMAL_FORMATTER.format(row.annualTax)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {CURRENCY_DECIMAL_FORMATTER.format(
                            row.annualTax / 12,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <Disclaimer>
              Estimates only. Actual Grundsteuer is determined by the official
              Grundsteuerwertbescheid from your Finanzamt and the
              Grundsteuerbescheid from your municipality. Hebesätze may change
              annually. The Bavaria and Baden-Württemberg models use simplified
              inputs — consult a <em>Steuerberater</em> for your exact
              liability. For Bavaria: the Äquivalenzbetrag caps area at 100 sqm
              (building) and 500 sqm (land) for the full rate.
            </Disclaimer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GrundsteuerCalculator }
