/**
 * Rental Contract Review Step Content
 * Mietvertrag upload, translation, red flag analysis, and clause guidance
 */

import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useStepDocuments } from "@/hooks/queries"
import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"
import { StepDocumentReview } from "./StepDocumentReview"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalContractReview(props: Readonly<IProps>) {
  const { step } = props
  const { data: documents = [] } = useStepDocuments(step.id)

  // Most recently uploaded completed document (sort descending by createdAt)
  const completedDoc = documents
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((d) => d.status === "completed")

  // True only while actively processing — failed docs must not show a spinner
  const isProcessing = documents.some(
    (d) => d.status === "uploaded" || d.status === "processing",
  )

  return (
    <div className="space-y-4">
      {/* Mietvertrag upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            Upload your Mietvertrag (Rental Contract)
          </CardTitle>
          <CardDescription>
            Upload your German rental contract to translate it and detect
            potentially unfavourable clauses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StepDocumentReview stepId={step.id} />

          {/* Action buttons — always visible; Translate enabled once a doc completes */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {completedDoc ? (
              <Button size="sm" asChild>
                <Link
                  to="/documents/$documentId"
                  params={{ documentId: completedDoc.id }}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Translate Contract
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Translate Contract
                  </>
                )}
              </Button>
            )}

            <Button size="sm" variant="outline" asChild>
              <Link to="/contract-explainer">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Open Explainer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Static red flag insights */}
      <GuidanceCard
        title="Common Red Flags to Watch For"
        description="German rental contracts often contain clauses that tenants should scrutinise carefully before signing."
        items={[
          {
            icon: AlertTriangle,
            label: "Schönheitsreparaturen (Cosmetic Repairs)",
            detail:
              "Rigid renovation schedules requiring repainting every 3-5 years are frequently invalid under German law (BGH rulings). Any clause with fixed intervals should be flagged.",
          },
          {
            icon: Scale,
            label: "Staffelmiete (Stepped Rent Increases)",
            detail:
              "Pre-agreed rent increases at fixed dates. Ensure the steps are clearly specified and that increases do not exceed what is permitted under Mietpreisbremse regulations in your city.",
          },
          {
            icon: ShieldCheck,
            label: "Unusual Kündigungsfrist (Notice Periods)",
            detail:
              "Standard tenant notice is 3 months. Any clause extending this to 6+ months, or imposing a minimum tenancy (Mindestmietdauer) without clear justification, is worth questioning.",
          },
          {
            icon: FileText,
            label: "Nebenkostenabrechnung (Utility Billing)",
            detail:
              "Operating costs must be individually itemised. Flat-rate Nebenkosten without annual reconciliation or clauses excluding refunds of overpaid advance payments are red flags.",
          },
        ]}
      />

      {/* Key clauses guidance */}
      <GuidanceCard
        title="Key Mietvertrag Clauses"
        description="German lease agreements contain important clauses that affect your rights and obligations. Review each section carefully before signing."
        items={[
          {
            icon: FileText,
            label: "Rent & Payment Terms",
            detail:
              "Verify the Kaltmiete (base rent), Nebenkosten (utilities advance), total Warmmiete, payment due date, and landlord's bank details. Rent is typically due on the 3rd business day of each month.",
          },
          {
            icon: AlertTriangle,
            label: "Schönheitsreparaturen (Cosmetic Repairs)",
            detail:
              "Clauses requiring you to repaint or repair at set intervals are often invalid under German law (BGH rulings). Rigid renovation schedules are unenforceable — negotiate removal if present.",
          },
          {
            icon: Scale,
            label: "Rent Escalation Clauses",
            detail:
              "Staffelmiete (step rent) has pre-agreed increases. Indexmiete ties rent to inflation. Standard leases allow increases only up to the Mietspiegel. Know which type your lease uses.",
          },
          {
            icon: ShieldCheck,
            label: "Notice Period (Kündigungsfrist)",
            detail:
              "Standard tenant notice period is 3 months. Landlord notice periods increase with tenancy length (3-9 months). Minimum lease terms (Mindestmietdauer) should be checked carefully.",
          },
        ]}
        tip="If anything is unclear, consider consulting a Mieterverein (tenant association) before signing. Membership costs 50-100 EUR/year and includes legal advice on lease matters."
        ctaLabel="Find a Lawyer"
        ctaHref="/professionals"
        ctaSearch={{ type: "lawyer" }}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalContractReview }
