/**
 * Detailed Assessment — Section 2 of Mortgage Eligibility Checker
 * Numeric mortgage eligibility scoring with loan estimates and document checklist.
 */

import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Euro,
  ExternalLink,
  FileText,
  Landmark,
  Lightbulb,
  RefreshCw,
  Save,
  Share2,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
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
import { Separator } from "@/components/ui/separator"
import {
  useDeleteFinancingAssessment,
  useSaveFinancingAssessment,
} from "@/hooks/mutations/useCalculatorMutations"
import { useUserFinancingAssessments } from "@/hooks/queries/useCalculatorQueries"
import useCustomToast from "@/hooks/useCustomToast"
import type {
  EmploymentStatus,
  FinancingAssessmentInput,
  FinancingAssessmentSummary,
  FinancingResidencyStatus,
  SchufaRating,
} from "@/models/calculator"
import { handleError } from "@/utils"
import { FormRow } from "../common/FormRow"

// ***************************************************************************
//                              Types
// ***************************************************************************

interface AssessmentResults {
  employmentScore: number
  incomeRatioScore: number
  downPaymentScore: number
  schufaScore: number
  residencyScore: number
  yearsBonusScore: number
  totalScore: number
  likelihoodLabel: string
  maxLoanEstimate: number
  recommendedDownPaymentPercent: number
  expectedRateMin: number
  expectedRateMax: number
  ltvRatio: number
  strengths: string[]
  improvements: string[]
  documentChecklist: string[]
}

interface WizardInputs {
  employmentStatus: EmploymentStatus | ""
  employmentYears: string
  monthlyNetIncome: string
  monthlyDebt: string
  availableDownPayment: string
  schufaRating: SchufaRating | ""
  residencyStatus: FinancingResidencyStatus | ""
}

// ***************************************************************************
//                              Constants
// ***************************************************************************

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const ASSUMED_PROPERTY_PRICE = 300_000

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "permanent", label: "Permanent (Unbefristet)" },
  { value: "fixed_term", label: "Fixed-term (Befristet)" },
  { value: "self_employed", label: "Self-employed (Selbstständig)" },
  { value: "freelance", label: "Freelance (Freiberuflich)" },
  { value: "civil_servant", label: "Civil Servant (Beamter)" },
]

const SCHUFA_OPTIONS: { value: SchufaRating; label: string }[] = [
  { value: "excellent", label: "Excellent — 776-999 pts" },
  { value: "good", label: "Good — 709-775 pts" },
  { value: "acceptable", label: "Acceptable — 642-708 pts" },
  { value: "sufficient", label: "Sufficient — 100-641 pts" },
  { value: "insufficient", label: "Insufficient — no score" },
  { value: "unknown", label: "Unknown / Not yet obtained" },
]

const RESIDENCY_OPTIONS: {
  value: FinancingResidencyStatus
  label: string
}[] = [
  { value: "german_citizen", label: "German Citizen" },
  { value: "eu_citizen", label: "EU Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "temporary_resident", label: "Temporary Resident" },
  { value: "non_eu", label: "Non-EU Resident" },
  { value: "non_resident", label: "Non-Resident (Buying from Abroad)" },
]

const LIKELIHOOD_COLORS: Record<string, string> = {
  High: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Good: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  Moderate:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Low: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Very Low": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const SCORE_BAR_COLORS: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
}

type BankStatus = "yes" | "limited" | "unlikely"

interface BankEntry {
  bank: string
  status: BankStatus
}

const BANK_COMPATIBILITY: Record<FinancingResidencyStatus, BankEntry[]> = {
  german_citizen: [
    { bank: "Sparkasse", status: "yes" },
    { bank: "Deutsche Bank", status: "yes" },
    { bank: "ING-DiBa", status: "yes" },
    { bank: "Commerzbank", status: "yes" },
    { bank: "Online Banks (N26/DKB)", status: "yes" },
  ],
  eu_citizen: [
    { bank: "Sparkasse", status: "yes" },
    { bank: "Deutsche Bank", status: "yes" },
    { bank: "ING-DiBa", status: "yes" },
    { bank: "Commerzbank", status: "yes" },
    { bank: "Online Banks (N26/DKB)", status: "limited" },
  ],
  permanent_resident: [
    { bank: "Sparkasse", status: "yes" },
    { bank: "Deutsche Bank", status: "yes" },
    { bank: "ING-DiBa", status: "yes" },
    { bank: "Commerzbank", status: "yes" },
    { bank: "Online Banks (N26/DKB)", status: "limited" },
  ],
  temporary_resident: [
    { bank: "Sparkasse", status: "limited" },
    { bank: "Deutsche Bank", status: "limited" },
    { bank: "ING-DiBa", status: "limited" },
    { bank: "Commerzbank", status: "limited" },
    { bank: "Online Banks (N26/DKB)", status: "unlikely" },
  ],
  non_eu: [
    { bank: "Sparkasse", status: "limited" },
    { bank: "Deutsche Bank", status: "limited" },
    { bank: "ING-DiBa", status: "unlikely" },
    { bank: "Commerzbank", status: "unlikely" },
    { bank: "Online Banks (N26/DKB)", status: "unlikely" },
  ],
  non_resident: [
    { bank: "Sparkasse", status: "unlikely" },
    { bank: "Deutsche Bank", status: "limited" },
    { bank: "ING-DiBa", status: "unlikely" },
    { bank: "Commerzbank", status: "unlikely" },
    { bank: "Online Banks (N26/DKB)", status: "unlikely" },
  ],
}

const BANK_STATUS_STYLES: Record<BankStatus, string> = {
  yes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  limited:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  unlikely: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const BANK_STATUS_LABELS: Record<BankStatus, string> = {
  yes: "Likely",
  limited: "Case-by-case",
  unlikely: "Unlikely",
}

const FINANCING_TIPS: Record<FinancingResidencyStatus, string[]> = {
  german_citizen: [
    "Compare rates across banks — even 0.1% difference saves thousands over the loan term",
    "Leverage Sondertilgung (special repayment) options to pay off your mortgage faster",
    "Explore KfW programs for energy-efficient properties — subsidized rates available",
  ],
  eu_citizen: [
    "Register at the Einwohnermeldeamt early — banks require proof of German address",
    "Your SCHUFA history matters — start building it as soon as you arrive in Germany",
    "Bring your EU credit history — some banks accept cross-border credit reports",
  ],
  permanent_resident: [
    "Your Niederlassungserlaubnis is key proof of long-term intent — highlight it in applications",
    "Bring complete employment history in Germany — continuity strengthens your case",
    "Consider a Bausparvertrag (building savings contract) for favorable future rates",
  ],
  temporary_resident: [
    "Demonstrate long-term intent to stay — job contracts and family ties help",
    "Consider a co-signer with German residency or citizenship to strengthen the application",
    "Gather extra documentation — banks will scrutinize temporary residents more closely",
  ],
  non_eu: [
    "Target banks with international divisions — they have experience with non-EU applicants",
    "Work with a mortgage broker (Kreditvermittler) who specializes in expat financing",
    "Start building SCHUFA history early — even a mobile phone contract helps",
  ],
  non_resident: [
    "Appoint a local representative with power of attorney (Vollmacht) for in-person steps",
    "Expect 0.5–1% higher interest rates compared to resident buyers",
    "Open a German bank account early — most lenders require it for mortgage disbursement",
    "Consider specialized international mortgage brokers with cross-border experience",
  ],
}

// ***************************************************************************
//                              Functions
// ***************************************************************************

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "")
  return Number.parseFloat(cleaned) || 0
}

function scoreEmployment(status: EmploymentStatus): number {
  const scores: Record<EmploymentStatus, number> = {
    civil_servant: 20,
    permanent: 18,
    fixed_term: 10,
    self_employed: 8,
    freelance: 6,
  }
  return scores[status] ?? 5
}

function scoreIncomeRatio(income: number, debt: number): number {
  if (income <= 0) return 0
  const ratio = debt / income
  if (ratio <= 0.15) return 20
  if (ratio <= 0.25) return 16
  if (ratio <= 0.35) return 12
  if (ratio <= 0.45) return 6
  return 2
}

function scoreDownPayment(dp: number): number {
  const pct = dp / ASSUMED_PROPERTY_PRICE
  if (pct >= 0.3) return 20
  if (pct >= 0.2) return 16
  if (pct >= 0.1) return 12
  if (pct >= 0.05) return 6
  return 2
}

function scoreSchufa(rating: SchufaRating): number {
  const scores: Record<SchufaRating, number> = {
    excellent: 15,
    good: 12,
    acceptable: 9,
    sufficient: 5,
    insufficient: 2,
    unknown: 3,
  }
  return scores[rating] ?? 3
}

function scoreResidency(status: FinancingResidencyStatus): number {
  const scores: Record<FinancingResidencyStatus, number> = {
    german_citizen: 15,
    eu_citizen: 13,
    permanent_resident: 11,
    temporary_resident: 6,
    non_eu: 4,
    non_resident: 2,
  }
  return scores[status] ?? 4
}

function scoreEmploymentYears(years: number): number {
  if (years >= 5) return 10
  if (years >= 3) return 8
  if (years >= 2) return 6
  if (years >= 1) return 4
  return 2
}

function likelihoodLabel(score: number): string {
  if (score >= 80) return "High"
  if (score >= 60) return "Good"
  if (score >= 40) return "Moderate"
  if (score >= 20) return "Low"
  return "Very Low"
}

function estimateMaxLoan(income: number, debt: number): number {
  const disposable = income - debt
  if (disposable <= 0) return 0
  return Math.round(disposable * 100)
}

function recommendedDpPercent(
  residency: FinancingResidencyStatus,
  schufa: SchufaRating,
): number {
  let base: number
  if (residency === "non_resident") {
    base = 40
  } else if (residency === "non_eu" || residency === "temporary_resident") {
    base = 30
  } else {
    base = 20
  }
  if (schufa === "insufficient" || schufa === "unknown") base += 5
  if (
    residency === "german_citizen" &&
    (schufa === "excellent" || schufa === "good")
  )
    base = 15
  return Math.min(base, 50)
}

function estimateRateRange(totalScore: number): [number, number] {
  if (totalScore >= 80) return [3.0, 3.8]
  if (totalScore >= 60) return [3.5, 4.5]
  if (totalScore >= 40) return [4.0, 5.5]
  if (totalScore >= 20) return [5.0, 7.0]
  return [6.0, 8.5]
}

type ScoreBreakdown = Pick<
  AssessmentResults,
  | "employmentScore"
  | "incomeRatioScore"
  | "downPaymentScore"
  | "schufaScore"
  | "residencyScore"
  | "yearsBonusScore"
>

function buildStrengths(scores: ScoreBreakdown): string[] {
  const strengths: string[] = []
  if (scores.employmentScore >= 16)
    strengths.push("Stable employment type is highly valued by German banks")
  if (scores.incomeRatioScore >= 16)
    strengths.push("Healthy debt-to-income ratio well within bank limits")
  if (scores.downPaymentScore >= 16)
    strengths.push("Strong down payment reduces risk and improves loan terms")
  if (scores.schufaScore >= 12)
    strengths.push("Good SCHUFA credit rating strengthens your application")
  if (scores.residencyScore >= 11)
    strengths.push("Residency status provides favorable lending conditions")
  if (scores.yearsBonusScore >= 8)
    strengths.push("Long employment tenure demonstrates financial stability")
  return strengths
}

function buildImprovements(scores: ScoreBreakdown): string[] {
  const improvements: string[] = []
  if (scores.employmentScore < 12)
    improvements.push(
      "Consider securing permanent employment before applying — banks prefer unbefristete Arbeitsverträge",
    )
  if (scores.incomeRatioScore < 12)
    improvements.push(
      "Reduce monthly debt obligations to improve your debt-to-income ratio below 35%",
    )
  if (scores.downPaymentScore < 12)
    improvements.push(
      "Save for a larger down payment — aim for at least 20% of property price to unlock better rates",
    )
  if (scores.schufaScore < 9)
    improvements.push(
      "Improve your SCHUFA score by paying debts on time and closing unused credit accounts",
    )
  if (scores.residencyScore < 3)
    improvements.push(
      "Consider establishing German residency before applying — non-resident buyers face significantly higher down payment requirements and limited bank options",
    )
  else if (scores.residencyScore < 11)
    improvements.push(
      "Apply for permanent residency (Niederlassungserlaubnis) to improve lending eligibility",
    )
  if (scores.yearsBonusScore < 6)
    improvements.push(
      "Wait until you have at least 2 years at your current employer — banks value employment stability",
    )
  return improvements
}

function buildDocumentChecklist(
  employmentStatus: EmploymentStatus,
  residencyStatus: FinancingResidencyStatus,
  hasDownPayment: boolean,
): string[] {
  const docs = [
    "Valid passport or ID (Personalausweis)",
    "Proof of income — last 3 payslips (Gehaltsabrechnungen)",
    "Bank statements — last 3 months (Kontoauszüge)",
    "SCHUFA credit report (Selbstauskunft)",
    "Employment contract (Arbeitsvertrag)",
    "Tax returns — last 2 years (Steuerbescheide)",
  ]
  if (
    employmentStatus === "self_employed" ||
    employmentStatus === "freelance"
  ) {
    docs.push(
      "Business financial statements — last 3 years (BWA + Bilanz)",
      "Tax advisor confirmation letter (Steuerberater-Bescheinigung)",
      "Business registration certificate (Gewerbeanmeldung)",
    )
  }
  if (
    residencyStatus === "temporary_resident" ||
    residencyStatus === "non_eu"
  ) {
    docs.push(
      "Residence permit (Aufenthaltstitel)",
      "Registration certificate (Meldebescheinigung)",
    )
  }
  if (residencyStatus === "non_resident") {
    docs.push(
      "Tax returns from home country — last 2 years",
      "Proof of income from abroad (employment letter + payslips)",
      "Power of attorney for German representative (Vollmacht)",
      "Proof of funds origin (Herkunftsnachweis — anti-money-laundering)",
    )
  }
  if (residencyStatus === "eu_citizen") {
    docs.push("EU registration certificate (Freizügigkeitsbescheinigung)")
  }
  if (hasDownPayment) {
    docs.push("Proof of down payment funds (Eigenkapitalnachweis)")
  }
  return docs
}

function calculateAssessment(inputs: WizardInputs): AssessmentResults | null {
  if (
    !inputs.employmentStatus ||
    !inputs.schufaRating ||
    !inputs.residencyStatus
  )
    return null
  const income = parseNumber(inputs.monthlyNetIncome)
  if (income <= 0) return null

  const debt = parseNumber(inputs.monthlyDebt)
  const dp = parseNumber(inputs.availableDownPayment)
  const years = parseNumber(inputs.employmentYears)

  const employmentScore = scoreEmployment(inputs.employmentStatus)
  const incomeRatioScore = scoreIncomeRatio(income, debt)
  const downPaymentScore = scoreDownPayment(dp)
  const schufaScore = scoreSchufa(inputs.schufaRating)
  const residencyScore = scoreResidency(inputs.residencyStatus)
  const yearsBonusScore = scoreEmploymentYears(years)

  const totalScore =
    Math.round(
      (employmentScore +
        incomeRatioScore +
        downPaymentScore +
        schufaScore +
        residencyScore +
        yearsBonusScore) *
        10,
    ) / 10

  const label = likelihoodLabel(totalScore)
  const maxLoan = estimateMaxLoan(income, debt)
  const recDp = recommendedDpPercent(
    inputs.residencyStatus,
    inputs.schufaRating,
  )
  const [rateMin, rateMax] = estimateRateRange(totalScore)
  const ltvTotal = dp + maxLoan
  const ltv = ltvTotal > 0 ? maxLoan / ltvTotal : 0

  const scores: ScoreBreakdown = {
    employmentScore,
    incomeRatioScore,
    downPaymentScore,
    schufaScore,
    residencyScore,
    yearsBonusScore,
  }

  return {
    ...scores,
    totalScore,
    likelihoodLabel: label,
    maxLoanEstimate: maxLoan,
    recommendedDownPaymentPercent: recDp,
    expectedRateMin: rateMin,
    expectedRateMax: rateMax,
    ltvRatio: ltv,
    strengths: buildStrengths(scores),
    improvements: buildImprovements(scores),
    documentChecklist: buildDocumentChecklist(
      inputs.employmentStatus,
      inputs.residencyStatus,
      dp > 0,
    ),
  }
}

// ***************************************************************************
//                              Components
// ***************************************************************************

function LikelihoodBadge(props: {
  score: number
  label: string
  size?: "sm" | "md"
}) {
  const { score, label, size = "md" } = props
  const colorClass = LIKELIHOOD_COLORS[label] || LIKELIHOOD_COLORS.Moderate

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      {score.toFixed(1)}/100 {label}
    </span>
  )
}

function ScoreBar(props: { label: string; score: number; maxScore: number }) {
  const { label, score, maxScore } = props
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  const barColor =
    pct >= 70
      ? SCORE_BAR_COLORS.high
      : pct >= 40
        ? SCORE_BAR_COLORS.medium
        : SCORE_BAR_COLORS.low

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BankCompatibilityTable(props: {
  residencyStatus: FinancingResidencyStatus
}) {
  const banks = BANK_COMPATIBILITY[props.residencyStatus]

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium">
        <Landmark className="h-4 w-4" />
        Bank Compatibility
      </h4>
      <div className="space-y-1.5">
        {banks.map((entry) => (
          <div
            key={entry.bank}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <span>{entry.bank}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                BANK_STATUS_STYLES[entry.status],
              )}
            >
              {BANK_STATUS_LABELS[entry.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinancingTipsCard(props: {
  residencyStatus: FinancingResidencyStatus
}) {
  const tips = FINANCING_TIPS[props.residencyStatus]

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Financing Tips for Your Situation
      </h4>
      <ul className="space-y-1">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SavedAssessments(props: {
  assessments: FinancingAssessmentSummary[]
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const { assessments, onDelete, isDeleting } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saved Assessments</CardTitle>
        <CardDescription>
          Your previously saved financing assessments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assessments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">
                    {a.name ||
                      `Assessment — ${CURRENCY_FORMATTER.format(a.maxLoanEstimate)} max loan`}
                  </p>
                  <LikelihoodBadge
                    score={a.totalScore}
                    label={a.likelihoodLabel}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="ml-2 flex items-center gap-1">
                {a.shareId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/calculators?financingShare=${a.shareId}`
                      navigator.clipboard.writeText(url)
                    }}
                    title="Copy share link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(a.id)}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ***************************************************************************
//                              Main Component
// ***************************************************************************

function DetailedAssessment() {
  const [inputs, setInputs] = useState<WizardInputs>({
    employmentStatus: "",
    employmentYears: "",
    monthlyNetIncome: "",
    monthlyDebt: "",
    availableDownPayment: "",
    schufaRating: "",
    residencyStatus: "",
  })

  const [saveName, setSaveName] = useState("")
  const [shareUrl, setShareUrl] = useState("")

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const saveAssessment = useSaveFinancingAssessment()
  const deleteAssessment = useDeleteFinancingAssessment()
  const { data: savedAssessments } = useUserFinancingAssessments()

  const results = useMemo(() => calculateAssessment(inputs), [inputs])

  const handlePriceInput = (
    key: keyof WizardInputs,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setInputs({
      employmentStatus: "",
      employmentYears: "",
      monthlyNetIncome: "",
      monthlyDebt: "",
      availableDownPayment: "",
      schufaRating: "",
      residencyStatus: "",
    })
    setShareUrl("")
  }

  const handleExport = () => {
    if (!results) return
    const data = { inputs, results, generatedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `financing-assessment-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    if (
      !results ||
      !inputs.employmentStatus ||
      !inputs.schufaRating ||
      !inputs.residencyStatus
    )
      return
    const input: FinancingAssessmentInput = {
      name: saveName || undefined,
      employmentStatus: inputs.employmentStatus,
      employmentYears: parseNumber(inputs.employmentYears),
      monthlyNetIncome: parseNumber(inputs.monthlyNetIncome),
      monthlyDebt: parseNumber(inputs.monthlyDebt),
      availableDownPayment: parseNumber(inputs.availableDownPayment),
      schufaRating: inputs.schufaRating,
      residencyStatus: inputs.residencyStatus,
    }
    saveAssessment.mutate(input, {
      onSuccess: (saved) => {
        setSaveName("")
        showSuccessToast("Financing assessment saved")
        if (saved.shareId) {
          const url = `${window.location.origin}/calculators?financingShare=${saved.shareId}`
          setShareUrl(url)
        }
      },
      onError: handleError.bind(showErrorToast),
    })
  }

  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      showSuccessToast("Share link copied to clipboard")
    }
  }

  const handleDelete = (id: string) => {
    deleteAssessment.mutate(id, {
      onSuccess: () => showSuccessToast("Financing assessment deleted"),
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Your Financial Details
            </CardTitle>
            <CardDescription>
              Assess your mortgage likelihood as a foreign buyer in Germany
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Employment
              </h4>
              <FormRow label="Employment Status">
                <Select
                  value={inputs.employmentStatus}
                  onValueChange={(v) =>
                    setInputs((prev) => ({
                      ...prev,
                      employmentStatus: v as EmploymentStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow
                htmlFor="da-employmentYears"
                label="Years at Current Job"
              >
                <Input
                  id="da-employmentYears"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 3"
                  value={inputs.employmentYears}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      employmentYears: e.target.value,
                    }))
                  }
                />
              </FormRow>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Income & Debt
              </h4>
              <FormRow htmlFor="da-monthlyNetIncome" label="Monthly Net Income">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="da-monthlyNetIncome"
                    type="text"
                    inputMode="numeric"
                    placeholder="4,000"
                    value={
                      inputs.monthlyNetIncome
                        ? Number.parseInt(
                            inputs.monthlyNetIncome,
                            10,
                          ).toLocaleString("de-DE")
                        : ""
                    }
                    onChange={(e) => handlePriceInput("monthlyNetIncome", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
              <FormRow htmlFor="da-monthlyDebt" label="Monthly Debt Payments">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="da-monthlyDebt"
                    type="text"
                    inputMode="numeric"
                    placeholder="500"
                    value={
                      inputs.monthlyDebt
                        ? Number.parseInt(
                            inputs.monthlyDebt,
                            10,
                          ).toLocaleString("de-DE")
                        : ""
                    }
                    onChange={(e) => handlePriceInput("monthlyDebt", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Down Payment
              </h4>
              <FormRow
                htmlFor="da-availableDownPayment"
                label="Available Down Payment"
              >
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="da-availableDownPayment"
                    type="text"
                    inputMode="numeric"
                    placeholder="60,000"
                    value={
                      inputs.availableDownPayment
                        ? Number.parseInt(
                            inputs.availableDownPayment,
                            10,
                          ).toLocaleString("de-DE")
                        : ""
                    }
                    onChange={(e) =>
                      handlePriceInput("availableDownPayment", e)
                    }
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Credit & Residency
              </h4>
              <FormRow label="SCHUFA Rating">
                <Select
                  value={inputs.schufaRating}
                  onValueChange={(v) =>
                    setInputs((prev) => ({
                      ...prev,
                      schufaRating: v as SchufaRating,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHUFA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow label="Residency Status">
                <Select
                  value={inputs.residencyStatus}
                  onValueChange={(v) =>
                    setInputs((prev) => ({
                      ...prev,
                      residencyStatus: v as FinancingResidencyStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESIDENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Assessment Results</CardTitle>
                <CardDescription>
                  Mortgage likelihood and recommendations
                </CardDescription>
              </div>
              {results && (
                <LikelihoodBadge
                  score={results.totalScore}
                  label={results.likelihoodLabel}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Score Breakdown</h4>
                  <ScoreBar
                    label="Employment Type"
                    score={results.employmentScore}
                    maxScore={20}
                  />
                  <ScoreBar
                    label="Debt-to-Income"
                    score={results.incomeRatioScore}
                    maxScore={20}
                  />
                  <ScoreBar
                    label="Down Payment"
                    score={results.downPaymentScore}
                    maxScore={20}
                  />
                  <ScoreBar
                    label="SCHUFA Rating"
                    score={results.schufaScore}
                    maxScore={15}
                  />
                  <ScoreBar
                    label="Residency Status"
                    score={results.residencyScore}
                    maxScore={15}
                  />
                  <ScoreBar
                    label="Employment Tenure"
                    score={results.yearsBonusScore}
                    maxScore={10}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Loan Estimates</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">
                        Max Loan Estimate
                      </p>
                      <p className="text-xl font-bold">
                        {CURRENCY_FORMATTER.format(results.maxLoanEstimate)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">
                        Recommended Down Payment
                      </p>
                      <p className="text-xl font-bold">
                        {results.recommendedDownPaymentPercent}%
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">
                        Expected Rate Range
                      </p>
                      <p className="text-xl font-bold">
                        {results.expectedRateMin}% – {results.expectedRateMax}%
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">
                        Loan-to-Value Ratio
                      </p>
                      <p className="text-xl font-bold">
                        {(results.ltvRatio * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {inputs.residencyStatus && (
                  <>
                    <Separator />
                    <BankCompatibilityTable
                      residencyStatus={inputs.residencyStatus}
                    />
                  </>
                )}

                {inputs.residencyStatus && (
                  <>
                    <Separator />
                    <FinancingTipsCard
                      residencyStatus={inputs.residencyStatus}
                    />
                  </>
                )}

                <Separator />

                {results.strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {results.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.improvements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                      {results.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Document Checklist
                  </h4>
                  <ul className="space-y-1">
                    {results.documentChecklist.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                  <p className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                    Ready to see your payment schedule?
                  </p>
                  <Link
                    to="/calculators"
                    search={{ tab: "mortgage" }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    See your estimated payments
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <Separator />

                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>

                <div className="space-y-2">
                  <Input
                    placeholder="Name this assessment (optional)"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <Button
                    onClick={handleSave}
                    disabled={saveAssessment.isPending}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveAssessment.isPending ? "Saving..." : "Save Assessment"}
                  </Button>
                </div>

                {shareUrl && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Share2 className="h-4 w-4" />
                      Share Link
                    </p>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="text-xs" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyShareUrl}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Landmark className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Fill in your details to see your financing assessment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {savedAssessments && savedAssessments.data.length > 0 && (
        <SavedAssessments
          assessments={savedAssessments.data}
          onDelete={handleDelete}
          isDeleting={deleteAssessment.isPending}
        />
      )}
    </div>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export { DetailedAssessment }
