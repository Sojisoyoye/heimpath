/**
 * Mortgage Eligibility Guide
 * Interactive guide for non-citizen mortgage eligibility in Germany.
 * Covers EU/EEA, non-EU permanent residents, limited visa holders, and non-residents.
 */

import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ELIGIBILITY_PROFILES,
  LENDER_STATUS_STYLES,
  NATIONALITY_GROUP_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "./eligibilityData"
import type {
  EligibilityStatus,
  EmploymentType,
  ILenderResult,
  NationalityGroup,
  PropertyUse,
} from "./types"

/******************************************************************************
                              Constants
******************************************************************************/

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employed: "Employed (permanent or fixed-term contract)",
  self_employed: "Self-employed (2+ years of tax returns)",
  freelance: "Freelancer / contractor",
  non_german_income: "Income from abroad (no German employer)",
}

const PROPERTY_USE_LABELS: Record<PropertyUse, string> = {
  primary: "Primary residence (I will live in it)",
  rental: "Rental investment (I will rent it out)",
}

const LENDER_STATUS_ICONS: Record<EligibilityStatus, React.ReactNode> = {
  easy: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />,
  conditional: <Info className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />,
  difficult: (
    <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
  ),
  not_available: <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />,
}

/******************************************************************************
                              Components
******************************************************************************/

interface ILenderRowProps {
  result: ILenderResult
  propertyUse: PropertyUse
}

/** Single lender row in the eligibility table. */
function LenderRow(props: Readonly<ILenderRowProps>) {
  const { result, propertyUse } = props

  // Rental investment: show 5% lower LTV as a note
  const ltv =
    result.maxLtv != null && propertyUse === "rental"
      ? result.maxLtv - 5
      : result.maxLtv

  const down =
    result.minDownPayment != null && propertyUse === "rental"
      ? result.minDownPayment + 5
      : result.minDownPayment

  return (
    <div className="flex flex-col gap-2 py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium">{result.lenderType}</p>
          <p className="text-xs text-muted-foreground">
            {result.lenderExamples}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {LENDER_STATUS_ICONS[result.eligibility]}
          <span
            className={cn(
              "text-xs font-medium",
              LENDER_STATUS_STYLES[result.eligibility],
            )}
          >
            {STATUS_LABELS[result.eligibility]}
          </span>
        </div>
      </div>
      {ltv != null && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            Max LTV: <span className="font-medium text-foreground">{ltv}%</span>
          </span>
          <span>
            Min down payment:{" "}
            <span className="font-medium text-foreground">{down}%</span>
          </span>
        </div>
      )}
      {result.notes.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
          {result.notes.map((note) => (
            <li key={note} className="list-disc list-outside">
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface IResultsProps {
  nationalityGroup: NationalityGroup
  employmentType: EmploymentType
  propertyUse: PropertyUse
}

/** Full eligibility results panel. */
function EligibilityResults(props: Readonly<IResultsProps>) {
  const { nationalityGroup, employmentType, propertyUse } = props
  const profile = ELIGIBILITY_PROFILES[nationalityGroup]
  const employmentNotes = profile.employmentNotes[employmentType]

  return (
    <div className="space-y-5">
      {/* Overall status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge
          className={cn(
            "text-sm px-3 py-1",
            STATUS_STYLES[profile.overallStatus],
          )}
        >
          {STATUS_LABELS[profile.overallStatus]}
        </Badge>
        {propertyUse === "rental" && (
          <Badge variant="outline" className="text-xs">
            Rental property — LTV reduced by ~5%
          </Badge>
        )}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {profile.summary}
          </p>
          {propertyUse === "rental" && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                {profile.rentalNote}
              </p>
            </div>
          )}
          {employmentNotes.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {employmentNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key requirements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Key Requirements</CardTitle>
          <CardDescription>
            Documents and criteria lenders will assess
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {profile.keyRequirements.map((req) => (
              <li key={req} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                {req}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Lender breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lender Breakdown</CardTitle>
          <CardDescription>
            Typical access by lender type for your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {profile.lenders.map((lender) => (
            <LenderRow
              key={lender.lenderType}
              result={lender}
              propertyUse={propertyUse}
            />
          ))}
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            to="/calculators"
            search={{ tab: "financing" }}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Calculate your monthly repayments with the Financing Wizard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/professionals"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Find a mortgage broker or financial advisor in our directory
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

/** Default export. Non-citizen mortgage eligibility guide. */
function MortgageEligibilityGuide() {
  const [nationalityGroup, setNationalityGroup] = useState<
    NationalityGroup | ""
  >("")
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("")
  const [propertyUse, setPropertyUse] = useState<PropertyUse | "">("")

  const isComplete =
    nationalityGroup !== "" && employmentType !== "" && propertyUse !== ""

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div>
        <p className="text-muted-foreground text-sm">
          Answer 3 questions to see which German banks and lenders are likely to
          finance your purchase — and on what terms.
        </p>
      </div>

      {/* Questionnaire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Profile</CardTitle>
          <CardDescription>
            This guide covers typical lender policies. Individual decisions vary
            — always consult a mortgage broker for a personalised assessment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Nationality */}
          <div className="space-y-1.5">
            <Label htmlFor="nationality">Nationality / Residence status</Label>
            <Select
              value={nationalityGroup}
              onValueChange={(v) => setNationalityGroup(v as NationalityGroup)}
            >
              <SelectTrigger id="nationality">
                <SelectValue placeholder="Select your status…" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(NATIONALITY_GROUP_LABELS) as [
                    NationalityGroup,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employment */}
          <div className="space-y-1.5">
            <Label htmlFor="employment">Employment type</Label>
            <Select
              value={employmentType}
              onValueChange={(v) => setEmploymentType(v as EmploymentType)}
            >
              <SelectTrigger id="employment">
                <SelectValue placeholder="Select employment type…" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(EMPLOYMENT_TYPE_LABELS) as [
                    EmploymentType,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property use */}
          <div className="space-y-1.5">
            <Label htmlFor="property-use">Intended property use</Label>
            <Select
              value={propertyUse}
              onValueChange={(v) => setPropertyUse(v as PropertyUse)}
            >
              <SelectTrigger id="property-use">
                <SelectValue placeholder="Select property use…" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(PROPERTY_USE_LABELS) as [PropertyUse, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isComplete && (
        <EligibilityResults
          nationalityGroup={nationalityGroup as NationalityGroup}
          employmentType={employmentType as EmploymentType}
          propertyUse={propertyUse as PropertyUse}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageEligibilityGuide }
