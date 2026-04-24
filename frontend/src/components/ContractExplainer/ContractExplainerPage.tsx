/**
 * Contract Explainer Page
 * Upload a German Kaufvertrag PDF and receive an AI clause-by-clause analysis
 */

import { Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  Calculator,
  CheckSquare,
  Copy,
  FileText,
  Lock,
  Share2,
  Square,
  Upload,
} from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAnalyzeContract, useShareContractAnalysis } from "@/hooks/mutations"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { ContractAnalysis, NotaryQuestion } from "@/models/contract"
import { ClauseCard } from "./ClauseCard"

/******************************************************************************
                              Constants
******************************************************************************/

const RISK_BADGE_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const PRIORITY_STYLES: Record<string, string> = {
  essential: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  recommended:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  optional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

/******************************************************************************
                              Components
******************************************************************************/

interface INotaryChecklistProps {
  questions: NotaryQuestion[]
}

/** Interactive notary checklist. */
function NotaryChecklist(props: Readonly<INotaryChecklistProps>) {
  const { questions } = props
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = useCallback((i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          What to Ask Your Notary
          <Badge variant="outline" className="ml-2 text-xs">
            {checked.size}/{questions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {questions.map((q, i) => (
          <button
            key={i}
            type="button"
            className="flex items-start gap-2 cursor-pointer w-full text-left"
            onClick={() => toggle(i)}
          >
            {checked.has(i) ? (
              <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            ) : (
              <Square className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm",
                  checked.has(i) && "line-through text-muted-foreground",
                )}
              >
                {q.question}
              </p>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                <Badge className={cn("text-xs", PRIORITY_STYLES[q.priority])}>
                  {q.priority}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {q.relatedClause}
                </span>
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

interface IUpgradeCtaProps {
  hiddenCount: number
}

/** Premium upgrade CTA shown when clauses are truncated. */
function UpgradeCta(props: Readonly<IUpgradeCtaProps>) {
  const { hiddenCount } = props
  const navigate = useNavigate()

  return (
    <div className="relative">
      {/* Blur overlay */}
      <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 text-center px-4">
        <Lock className="h-8 w-8 text-amber-600" />
        <p className="text-sm font-medium">
          {hiddenCount} more clause{hiddenCount !== 1 ? "s" : ""} available with
          Premium
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Upgrade to see the full analysis, notary checklist, and detailed risk
          explanations for all clauses.
        </p>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => navigate({ to: "/settings" })}
        >
          Upgrade to Premium
        </Button>
      </div>
      {/* Blurred placeholder clause */}
      <div className="rounded-lg border p-4 blur-sm select-none pointer-events-none">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted rounded w-full mb-1" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  )
}

interface IShareButtonProps {
  analysis: ContractAnalysis
}

/** Share button — generates link and copies it. */
function ShareButton(props: Readonly<IShareButtonProps>) {
  const { analysis } = props
  const { showSuccessToast } = useCustomToast()
  const { mutate: share, isPending } = useShareContractAnalysis(analysis.id)

  function handleShare() {
    if (analysis.shareId) {
      const url = `${window.location.origin}/contract-explainer/shared/${analysis.shareId}`
      navigator.clipboard.writeText(url)
      showSuccessToast("Link copied to clipboard!")
      return
    }
    share(undefined, {
      onSuccess: (updated) => {
        if (updated.shareId) {
          const url = `${window.location.origin}/contract-explainer/shared/${updated.shareId}`
          navigator.clipboard.writeText(url)
          showSuccessToast("Link copied to clipboard!")
        }
      },
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={isPending}
    >
      {analysis.shareId ? (
        <Copy className="h-4 w-4 mr-1.5" />
      ) : (
        <Share2 className="h-4 w-4 mr-1.5" />
      )}
      {analysis.shareId ? "Copy Link" : "Share"}
    </Button>
  )
}

interface IResultsProps {
  analysis: ContractAnalysis
  isPremium: boolean
}

/** Renders the full analysis results. */
function AnalysisResults(props: Readonly<IResultsProps>) {
  const { analysis, isPremium } = props

  const clauses = analysis.analyzedClauses ?? []
  const checklist = analysis.notaryChecklist ?? []
  const hiddenCount = analysis.clauseCount - clauses.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">{analysis.filename}</h2>
          <p className="text-sm text-muted-foreground">
            {analysis.clauseCount} clause{analysis.clauseCount !== 1 ? "s" : ""}{" "}
            analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analysis.overallRiskAssessment && (
            <Badge
              className={cn(
                "text-xs",
                RISK_BADGE_STYLES[analysis.overallRiskAssessment],
              )}
            >
              Overall:{" "}
              {analysis.overallRiskAssessment.charAt(0).toUpperCase() +
                analysis.overallRiskAssessment.slice(1)}{" "}
              Risk
            </Badge>
          )}
          <ShareButton analysis={analysis} />
        </div>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysis.summary}
            </p>
            {isPremium && analysis.overallRiskExplanation && (
              <>
                <Separator className="my-3" />
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>{analysis.overallRiskExplanation}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evaluate this property CTA */}
      {analysis.purchasePrice != null && analysis.purchasePrice > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex flex-col items-center gap-3 py-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Purchase price detected: €
                {analysis.purchasePrice.toLocaleString("de-DE")}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Analyse this property's investment return instantly.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link
                to="/calculators"
                search={{
                  tab: "property-evaluation",
                  purchasePrice: analysis.purchasePrice,
                }}
              >
                Evaluate this property
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clauses */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
          Clauses
        </h3>
        <div className="space-y-3">
          {clauses.map((clause, i) => (
            <ClauseCard key={i} clause={clause} index={i} />
          ))}
          {analysis.isTruncated && <UpgradeCta hiddenCount={hiddenCount} />}
        </div>
      </div>

      {/* Notary checklist (premium only) */}
      {isPremium && checklist.length > 0 && (
        <NotaryChecklist questions={checklist} />
      )}

      {!isPremium && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="pt-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Upgrade to Premium to unlock the notary checklist and all clause
              explanations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface IUploadProps {
  onAnalyzed: (analysis: ContractAnalysis) => void
}

/** File upload form with drag-and-drop. */
function UploadForm(props: Readonly<IUploadProps>) {
  const { onAnalyzed } = props
  const { mutate: analyze, isPending } = useAnalyzeContract()
  const [isDragging, setIsDragging] = useState(false)

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) return
    analyze(file, { onSuccess: onAnalyzed })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <label
      className={cn(
        "block border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
          : "border-muted hover:border-muted-foreground/50",
        isPending && "pointer-events-none opacity-60",
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {isPending ? (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center animate-pulse">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium">
            Analyzing your contract with AI…
          </p>
          <p className="text-xs text-muted-foreground">
            This may take up to 60 seconds for large contracts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Drop your Kaufvertrag PDF here</p>
          <p className="text-xs text-muted-foreground">
            or click to browse — PDF only, max 20 MB
          </p>
        </div>
      )}
    </label>
  )
}

/** Default component. Contract Explainer main page. */
function ContractExplainerPage() {
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null)

  const isPremium =
    user?.subscription_tier === "premium" ||
    user?.subscription_tier === "enterprise" ||
    user?.is_superuser === true

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Contract Explainer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a German Kaufvertrag (purchase contract) PDF and receive a
          clause-by-clause plain-English analysis with risk ratings.
        </p>
      </div>

      {!isPremium && !analysis && (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="pt-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Free plan: </span>
              <span className="text-muted-foreground">
                You can analyze a contract, but only the first 3 clauses are
                visible. Upgrade to Premium for the full analysis.
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload or results */}
      {!analysis ? (
        <UploadForm onAnalyzed={setAnalysis} />
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>
            ← Analyze another contract
          </Button>
          <AnalysisResults analysis={analysis} isPremium={isPremium} />
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ContractExplainerPage }
