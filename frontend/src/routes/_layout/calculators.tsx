/**
 * Calculators Page
 * Financial calculators for property investment
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpDown,
  Building2,
  Calculator,
  CalendarClock,
  ClipboardList,
  Euro,
  Globe,
  Home,
  Landmark,
  MapPin,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  AfaCalculator,
  CityComparison,
  CrossBorderTaxGuide,
  FinancingWizard,
  GegRetrofitCalculator,
  GrundsteuerCalculator,
  HiddenCostsCalculator,
  MortgageAmortisation,
  MortgageEligibilityGuide,
  OwnershipComparison,
  PropertyEvaluationCalculator,
  RentCeilingCalculator,
  RentEstimate,
  ROICalculator,
  SpeculationTaxCalculator,
  StateComparison,
  TenantTrapCalculator,
} from "@/components/Calculators"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
                              Components
******************************************************************************/

/** Default component. Calculators page with tabs. */
function CalculatorsPage() {
  const { tab, purchasePrice, monthlyRent } = Route.useSearch()

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Financial Calculators
        </h1>
        <p className="text-muted-foreground">
          Plan your property investment with our financial tools
        </p>
      </div>

      <Tabs defaultValue={tab || "costs"}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger
            value="costs"
            className="gap-2"
            aria-label="Hidden Costs"
          >
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Hidden Costs</span>
          </TabsTrigger>
          <TabsTrigger
            value="roi"
            className="gap-2"
            aria-label="ROI Calculator"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">ROI Calculator</span>
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="gap-2"
            aria-label="State Comparison"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">State Comparison</span>
          </TabsTrigger>
          <TabsTrigger
            value="financing"
            className="gap-2"
            aria-label="Financing"
          >
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Financing</span>
          </TabsTrigger>
          <TabsTrigger
            value="property-evaluation"
            className="gap-2"
            aria-label="Property Evaluation"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Property Evaluation</span>
          </TabsTrigger>
          <TabsTrigger
            value="ownership"
            className="gap-2"
            aria-label="GmbH vs. Private"
          >
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">GmbH vs. Private</span>
          </TabsTrigger>
          <TabsTrigger value="mortgage" className="gap-2" aria-label="Mortgage">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Mortgage</span>
          </TabsTrigger>
          <TabsTrigger
            value="cities"
            className="gap-2"
            aria-label="City Compare"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">City Compare</span>
          </TabsTrigger>
          <TabsTrigger
            value="tax-guide"
            className="gap-2"
            aria-label="Tax Guide"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Tax Guide</span>
          </TabsTrigger>
          <TabsTrigger
            value="eligibility"
            className="gap-2"
            aria-label="Mortgage Eligibility"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Eligibility</span>
          </TabsTrigger>
          <TabsTrigger
            value="rent-estimate"
            className="gap-2"
            aria-label="Rent Estimate"
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Rent Estimate</span>
          </TabsTrigger>
          <TabsTrigger
            value="speculation-tax"
            className="gap-2"
            aria-label="Speculation Tax"
          >
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Tax</span>
          </TabsTrigger>
          <TabsTrigger
            value="grundsteuer"
            className="gap-2"
            aria-label="Property Tax"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Property Tax</span>
          </TabsTrigger>
          <TabsTrigger
            value="afa"
            className="gap-2"
            aria-label="AfA Depreciation"
          >
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Depreciation</span>
          </TabsTrigger>
          <TabsTrigger
            value="tenant-trap"
            className="gap-2"
            aria-label="Tenant Risk"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Tenant Risk</span>
          </TabsTrigger>
          <TabsTrigger
            value="geg-retrofit"
            className="gap-2"
            aria-label="Energy Retrofit"
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Energy Retrofit</span>
          </TabsTrigger>
          <TabsTrigger
            value="rent-ceiling"
            className="gap-2"
            aria-label="Rent Ceiling Check"
          >
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Rent Ceiling</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="mt-6">
          <HiddenCostsCalculator />
        </TabsContent>

        <TabsContent value="roi" className="mt-6">
          <ROICalculator initialMonthlyRent={monthlyRent} />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <StateComparison />
        </TabsContent>

        <TabsContent value="financing" className="mt-6">
          <FinancingWizard />
        </TabsContent>

        <TabsContent value="property-evaluation" className="mt-6">
          <PropertyEvaluationCalculator initialPurchasePrice={purchasePrice} />
        </TabsContent>

        <TabsContent value="ownership" className="mt-6">
          <OwnershipComparison />
        </TabsContent>

        <TabsContent value="mortgage" className="mt-6">
          <MortgageAmortisation />
        </TabsContent>

        <TabsContent value="cities" className="mt-6">
          <CityComparison />
        </TabsContent>

        <TabsContent value="tax-guide" className="mt-6">
          <CrossBorderTaxGuide />
        </TabsContent>

        <TabsContent value="eligibility" className="mt-6">
          <MortgageEligibilityGuide />
        </TabsContent>

        <TabsContent value="rent-estimate" className="mt-6">
          <RentEstimate />
        </TabsContent>

        <TabsContent value="speculation-tax" className="mt-6">
          <SpeculationTaxCalculator />
        </TabsContent>

        <TabsContent value="grundsteuer" className="mt-6">
          <GrundsteuerCalculator />
        </TabsContent>

        <TabsContent value="afa" className="mt-6">
          <AfaCalculator />
        </TabsContent>

        <TabsContent value="tenant-trap" className="mt-6">
          <TenantTrapCalculator />
        </TabsContent>

        <TabsContent value="geg-retrofit" className="mt-6">
          <GegRetrofitCalculator />
        </TabsContent>

        <TabsContent value="rent-ceiling" className="mt-6">
          <RentCeilingCalculator />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default CalculatorsPage
