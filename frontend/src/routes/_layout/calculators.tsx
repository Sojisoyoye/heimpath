/**
 * Calculators Page
 * Financial calculators for property investment
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowUpDown,
  Building2,
  Calculator,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Euro,
  Globe,
  Home,
  MapPin,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import type { ElementType } from "react"
import { useState } from "react"
import {
  AfaCalculator,
  CityComparison,
  CrossBorderTaxGuide,
  GegRetrofitCalculator,
  GrundsteuerCalculator,
  HiddenCostsCalculator,
  MortgageAmortisation,
  MortgageEligibilityChecker,
  OwnershipComparison,
  PropertyEvaluationCalculator,
  RentAnalyser,
  ROICalculator,
  SpeculationTaxCalculator,
  StateComparison,
  TenantTrapCalculator,
} from "@/components/Calculators"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/calculators")({
  component: CalculatorsPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: string; purchasePrice?: number; monthlyRent?: number } => ({
    tab: (search.tab as string) || undefined,
    purchasePrice:
      typeof search.purchasePrice === "number"
        ? search.purchasePrice
        : typeof search.purchasePrice === "string"
          ? Number.parseFloat(search.purchasePrice) || undefined
          : undefined,
    monthlyRent:
      typeof search.monthlyRent === "number"
        ? search.monthlyRent
        : typeof search.monthlyRent === "string"
          ? Number.parseFloat(search.monthlyRent) || undefined
          : undefined,
  }),
  head: () => ({
    meta: [{ title: "Calculators - HeimPath" }],
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

interface ICalculatorItem {
  tab: string
  label: string
  description: string
  icon: ElementType
}

interface ICategory {
  id: string
  label: string
  items: ICalculatorItem[]
}

const CATEGORIES: ICategory[] = [
  {
    id: "buying-costs",
    label: "Buying Costs",
    items: [
      {
        tab: "costs",
        label: "Hidden Costs",
        description: "Calculate purchase fees, taxes and notary costs",
        icon: Euro,
      },
      {
        tab: "compare",
        label: "State Comparison",
        description:
          "Compare Grunderwerbsteuer (Property Transfer Tax) rates across German states",
        icon: ArrowUpDown,
      },
      {
        tab: "cities",
        label: "City Compare",
        description: "Side-by-side investment comparison across cities",
        icon: Building2,
      },
    ],
  },
  {
    id: "investment",
    label: "Investment Returns",
    items: [
      {
        tab: "roi",
        label: "ROI Calculator",
        description: "Net rental yield and cash-on-cash return analysis",
        icon: TrendingUp,
      },
      {
        tab: "property-evaluation",
        label: "Property Evaluation",
        description: "Multi-year investment performance model",
        icon: ClipboardList,
      },
      {
        tab: "ownership",
        label: "GmbH vs. Private",
        description: "Tax comparison for corporate vs. personal ownership",
        icon: Scale,
      },
      {
        tab: "speculation-tax",
        label: "Exit Tax",
        description:
          "Spekulationssteuer (Speculation Tax) on property sale within 10 years",
        icon: TrendingDown,
      },
      {
        tab: "afa",
        label: "Depreciation (AfA)",
        description: "Annual depreciation deductions on rental property",
        icon: TrendingDown,
      },
    ],
  },
  {
    id: "financing",
    label: "Financing",
    items: [
      {
        tab: "eligibility",
        label: "Mortgage Eligibility Checker",
        description:
          "Lender access overview and numeric eligibility score for foreign buyers",
        icon: ShieldCheck,
      },
      {
        tab: "mortgage",
        label: "Mortgage Amortisation",
        description: "Monthly repayment schedule and interest breakdown",
        icon: CalendarClock,
      },
      {
        tab: "tax-guide",
        label: "Cross-Border Tax",
        description: "Double taxation treaty guidance for non-residents",
        icon: Globe,
      },
    ],
  },
  {
    id: "renting",
    label: "Renting & Compliance",
    items: [
      {
        tab: "rent-analyser",
        label: "Rent Analyser",
        description:
          "Market rent estimate (Mietspiegel) and Mietpreisbremse compliance check in one tool",
        icon: MapPin,
      },
      {
        tab: "grundsteuer",
        label: "Property Tax",
        description:
          "Annual Grundsteuer (Property Tax) estimate for any German property",
        icon: Home,
      },
      {
        tab: "tenant-trap",
        label: "Tenant Risk",
        description: "Identify red flags in rental applications",
        icon: ShieldAlert,
      },
      {
        tab: "geg-retrofit",
        label: "Energy Retrofit",
        description: "GEG compliance cost estimate and savings projection",
        icon: Zap,
      },
    ],
  },
]

/** Flat lookup: tab value → item metadata */
const ITEM_MAP: Record<string, ICalculatorItem> = Object.fromEntries(
  CATEGORIES.flatMap((cat) => cat.items.map((item) => [item.tab, item])),
)

/******************************************************************************
                              Components
******************************************************************************/

interface ICalculatorGridProps {
  onSelect: (tab: string) => void
}

/** Grouped card grid — landing view when no calculator is selected */
function CalculatorGrid({ onSelect }: Readonly<ICalculatorGridProps>) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const visibleCategories =
    activeFilter == null
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.id === activeFilter)

  return (
    <div className="space-y-6">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeFilter == null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              setActiveFilter(activeFilter === cat.id ? null : cat.id)
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === cat.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Calculator cards grouped by category */}
      <div className="space-y-8">
        {visibleCategories.map((category) => (
          <div key={category.id}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => {
                const Icon = item.icon
                return (
                  <Card
                    key={item.tab}
                    className="cursor-pointer border transition-shadow hover:border-primary/40 hover:shadow-md"
                    onClick={() => onSelect(item.tab)}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 shrink-0 rounded-md bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium leading-snug">
                            {item.label}
                          </p>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface IActiveCalculatorProps {
  tab: string
  purchasePrice?: number
  monthlyRent?: number
  onBack: () => void
}

/** Renders the selected calculator with a back-to-grid breadcrumb */
function ActiveCalculator({
  tab,
  purchasePrice,
  monthlyRent,
  onBack,
}: Readonly<IActiveCalculatorProps>) {
  const item = ITEM_MAP[tab]

  const calculator = (() => {
    switch (tab) {
      case "costs":
        return <HiddenCostsCalculator />
      case "roi":
        return <ROICalculator initialMonthlyRent={monthlyRent} />
      case "compare":
        return <StateComparison />
      case "property-evaluation":
        return (
          <PropertyEvaluationCalculator initialPurchasePrice={purchasePrice} />
        )
      case "ownership":
        return <OwnershipComparison />
      case "mortgage":
        return <MortgageAmortisation />
      case "cities":
        return <CityComparison />
      case "tax-guide":
        return <CrossBorderTaxGuide />
      // "financing" was merged into "eligibility" — redirect gracefully
      case "financing":
      case "eligibility":
        return <MortgageEligibilityChecker />
      // "rent-estimate" and "rent-ceiling" were merged into "rent-analyser"
      case "rent-estimate":
      case "rent-ceiling":
      case "rent-analyser":
        return <RentAnalyser />
      case "speculation-tax":
        return <SpeculationTaxCalculator />
      case "grundsteuer":
        return <GrundsteuerCalculator />
      case "afa":
        return <AfaCalculator />
      case "tenant-trap":
        return <TenantTrapCalculator />
      case "geg-retrofit":
        return <GegRetrofitCalculator />
      default:
        return null
    }
  })()

  if (!calculator) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-1 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          All Calculators
        </Button>
        {item && (
          <span className="text-sm text-muted-foreground">/ {item.label}</span>
        )}
      </div>
      {calculator}
    </div>
  )
}

/** Default component. Calculators page with grouped card grid navigation. */
function CalculatorsPage() {
  const { tab, purchasePrice, monthlyRent } = Route.useSearch()
  const navigate = useNavigate()

  const handleSelect = (value: string) => {
    navigate({
      to: "/calculators",
      search: (prev) => ({ ...prev, tab: value }),
    })
  }

  const handleBack = () => {
    navigate({
      to: "/calculators",
      search: (prev) => ({ ...prev, tab: undefined }),
    })
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Calculator className="h-6 w-6" />
          Financial Calculators
        </h1>
        <p className="text-muted-foreground">
          Plan your property investment with our financial tools
        </p>
      </div>

      {tab !== undefined && ITEM_MAP[tab] !== undefined ? (
        <ActiveCalculator
          tab={tab}
          purchasePrice={purchasePrice}
          monthlyRent={monthlyRent}
          onBack={handleBack}
        />
      ) : (
        <CalculatorGrid onSelect={handleSelect} />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default CalculatorsPage
