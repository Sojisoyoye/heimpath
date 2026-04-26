/**
 * Type Analysis Component
 * AI-generated structured analysis for Grundbuchauszug, Teilungserklärung,
 * Mietvertrag, Wohnungsgrundriss, and WEG-Protokolle document types
 */

import { AlertTriangle, Bot } from "lucide-react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DocumentType,
  GrundbuchAnalysis,
  MietvertragAnalysis,
  RiskFlag,
  TeilungserklaerungAnalysis,
  WegProtokolleAnalysis,
  WegRiskFlag,
  WohnungsgrundrissAnalysis,
} from "@/models/document"

interface IProps {
  documentType: DocumentType
  typeAnalysis: Record<string, unknown>
}

/******************************************************************************
                              Constants
******************************************************************************/

const RISK_LEVEL_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

/******************************************************************************
                              Components
******************************************************************************/

interface IRiskFlagsProps {
  flags: RiskFlag[]
}

/** Risk flags table shared across all document type views. */
function RiskFlagsTable(props: Readonly<IRiskFlagsProps>) {
  const { flags } = props
  if (!flags.length) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {flags.map((f) => (
          <div
            key={`${f.flag}-${f.riskLevel}`}
            className="flex items-start gap-2"
          >
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0", RISK_LEVEL_STYLES[f.riskLevel])}
            >
              {f.riskLevel}
            </Badge>
            <div>
              <p className="text-sm font-medium">{f.flag}</p>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Land registry (Grundbuchauszug) structured view. */
function GrundbuchView(props: Readonly<{ data: GrundbuchAnalysis }>) {
  const { data } = props
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Property Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{data.propertyDescription}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Abteilung I — Owners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.abteilung1.owners.map((o) => (
            <div key={o.name} className="text-sm flex gap-2">
              <span className="font-medium">{o.name}</span>
              <span className="text-muted-foreground">{o.share}</span>
              {o.acquisitionDate && (
                <span className="text-muted-foreground">
                  ({o.acquisitionDate})
                </span>
              )}
            </div>
          ))}
          {!data.abteilung1.owners.length && (
            <p className="text-sm text-muted-foreground">No owners listed</p>
          )}
        </CardContent>
      </Card>
      {data.abteilung2.encumbrances.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Abteilung II — Encumbrances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.abteilung2.encumbrances.map((e) => (
              <div key={`${e.type}-${e.beneficiary}`} className="text-sm">
                <span className="font-medium">{e.type}</span>
                {" — "}
                <span>{e.beneficiary}</span>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.abteilung3.charges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Abteilung III — Charges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.abteilung3.charges.map((c) => (
              <div
                key={`${c.type}-${c.creditor}`}
                className="text-sm flex gap-2"
              >
                <span className="font-medium">{c.type}</span>
                <span className="text-muted-foreground">{c.creditor}</span>
                {c.amountEur !== null && (
                  <span>€{c.amountEur.toLocaleString()}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <RiskFlagsTable flags={data.riskFlags} />
    </div>
  )
}

/** Declaration of division (Teilungserklärung) structured view. */
function TeilungsView(props: Readonly<{ data: TeilungserklaerungAnalysis }>) {
  const { data } = props
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Unit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">{data.unitDescription}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Miteigentumsanteil:
            </span>
            <Badge variant="outline" className="text-xs">
              {data.miteigentumsanteil}
            </Badge>
          </div>
        </CardContent>
      </Card>
      {data.sondereigentum.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Private Property (Sondereigentum)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.sondereigentum.map((s) => (
              <div key={`${s.area}-${s.description}`} className="text-sm">
                <span className="font-medium">{s.area}</span>
                {" — "}
                <span className="text-muted-foreground">{s.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.gemeinschaftseigentum.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Common Property (Gemeinschaftseigentum)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {data.gemeinschaftseigentum.map((item) => (
                <li key={item} className="text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <RiskFlagsTable flags={data.riskFlags} />
    </div>
  )
}

/** Rental agreement (Mietvertrag) structured view. */
function MietvertragView(props: Readonly<{ data: MietvertragAnalysis }>) {
  const { data } = props
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Key Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Monthly Rent</p>
            <p className="text-sm font-medium">
              {data.monthlyRentEur === null
                ? "—"
                : `€${data.monthlyRentEur.toLocaleString()}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deposit</p>
            <p className="text-sm font-medium">
              {data.depositEur === null
                ? "—"
                : `€${data.depositEur.toLocaleString()}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Notice Period</p>
            <p className="text-sm font-medium">
              {data.noticePeriodMonths === null
                ? "—"
                : `${data.noticePeriodMonths} months`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lease Start</p>
            <p className="text-sm font-medium">{data.leaseStart ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lease End</p>
            <p className="text-sm font-medium">
              {data.isUnlimited ? "Unlimited" : (data.leaseEnd ?? "—")}
            </p>
          </div>
        </CardContent>
      </Card>
      {data.specialAgreements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Special Agreements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {data.specialAgreements.map((a) => (
                <li key={a} className="text-sm">
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <RiskFlagsTable flags={data.riskFlags} />
    </div>
  )
}

/** Floor plan (Wohnungsgrundriss) structured view. */
function GrundrissView(props: Readonly<{ data: WohnungsgrundrissAnalysis }>) {
  const { data } = props
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Rooms
            {data.totalAreaSqm !== null && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Total: {data.totalAreaSqm} m²
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {data.rooms.map((r) => (
              <div
                key={r.nameDe}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {r.nameEn}{" "}
                  <span className="text-muted-foreground">({r.nameDe})</span>
                </span>
                {r.areaSqm !== null && (
                  <span className="text-muted-foreground">{r.areaSqm} m²</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {data.features.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const RESERVE_ASSESSMENT_STYLES: Record<string, string> = {
  adequate:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

interface IWegRiskFlagProps {
  flag: WegRiskFlag
}

/** Single WEG risk flag with source quotes. */
function WegRiskFlagRow(props: Readonly<IWegRiskFlagProps>) {
  const { flag } = props
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <Badge
          variant="outline"
          className={cn("text-xs shrink-0", RISK_LEVEL_STYLES[flag.riskLevel])}
        >
          {flag.riskLevel}
        </Badge>
        <div>
          <p className="text-sm font-medium">{flag.flag}</p>
          <p className="text-xs text-muted-foreground">{flag.description}</p>
        </div>
      </div>
      {flag.sourceQuoteDe && (
        <blockquote className="ml-4 pl-3 border-l-2 border-muted text-xs text-muted-foreground italic">
          <p>{flag.sourceQuoteDe}</p>
          {flag.sourceQuoteEn && (
            <p className="mt-0.5 not-italic">{flag.sourceQuoteEn}</p>
          )}
        </blockquote>
      )}
    </div>
  )
}

/** WEG meeting minutes (Protokolle) structured audit view. */
function WegProtokolleView(props: Readonly<{ data: WegProtokolleAnalysis }>) {
  const { data } = props
  const hasNoIssues =
    !data.lowConfidenceWarning &&
    data.riskFlags.length === 0 &&
    data.upcomingCosts.length === 0 &&
    data.disputes.length === 0

  return (
    <div className="space-y-4">
      {data.lowConfidenceWarning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Low confidence — this document may contain OCR artifacts or be from
            a scanned/handwritten source. Verify findings manually.
          </p>
        </div>
      )}
      {hasNoIssues && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardContent className="pt-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              No significant risk flags, upcoming costs, or disputes found in
              this Protokoll.
            </p>
          </CardContent>
        </Card>
      )}
      {data.riskFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.riskFlags.map((f) => (
              <WegRiskFlagRow key={`${f.flag}-${f.riskLevel}`} flag={f} />
            ))}
          </CardContent>
        </Card>
      )}
      {data.reserveAssessment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Maintenance Reserve (Instandhaltungsrücklage)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              {data.reserveAssessment.reserveBalanceEur !== null && (
                <span className="text-sm font-medium">
                  €{data.reserveAssessment.reserveBalanceEur.toLocaleString()}
                </span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  RESERVE_ASSESSMENT_STYLES[data.reserveAssessment.assessment],
                )}
              >
                {data.reserveAssessment.assessment}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.reserveAssessment.details}
            </p>
          </CardContent>
        </Card>
      )}
      {data.upcomingCosts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.upcomingCosts.map((cost) => (
              <div key={cost.description} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{cost.description}</p>
                  <div className="text-right shrink-0">
                    {cost.estimatedEur !== null && (
                      <p className="text-sm">
                        €{cost.estimatedEur.toLocaleString()}
                      </p>
                    )}
                    {cost.timeline && (
                      <p className="text-xs text-muted-foreground">
                        {cost.timeline}
                      </p>
                    )}
                  </div>
                </div>
                {cost.sourceQuoteDe && (
                  <blockquote className="pl-3 border-l-2 border-muted text-xs text-muted-foreground italic">
                    <p>{cost.sourceQuoteDe}</p>
                    {cost.sourceQuoteEn && (
                      <p className="mt-0.5 not-italic">{cost.sourceQuoteEn}</p>
                    )}
                  </blockquote>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.disputes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Legal Disputes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.disputes.map((dispute) => (
              <div key={dispute.description} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{dispute.description}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {dispute.status}
                  </Badge>
                </div>
                {dispute.sourceQuoteDe && (
                  <blockquote className="pl-3 border-l-2 border-muted text-xs text-muted-foreground italic">
                    <p>{dispute.sourceQuoteDe}</p>
                    {dispute.sourceQuoteEn && (
                      <p className="mt-0.5 not-italic">
                        {dispute.sourceQuoteEn}
                      </p>
                    )}
                  </blockquote>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Default component. Type-specific AI analysis viewer. */
function TypeAnalysis(props: Readonly<IProps>) {
  const { documentType, typeAnalysis } = props
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              AI-generated analysis — always verify with a qualified
              professional
            </span>
          </div>
        </CardContent>
      </Card>
      {documentType === "grundbuchauszug" && (
        <GrundbuchView data={typeAnalysis as unknown as GrundbuchAnalysis} />
      )}
      {documentType === "teilungserklaerung" && (
        <TeilungsView
          data={typeAnalysis as unknown as TeilungserklaerungAnalysis}
        />
      )}
      {documentType === "mietvertrag" && (
        <MietvertragView
          data={typeAnalysis as unknown as MietvertragAnalysis}
        />
      )}
      {documentType === "wohnungsgrundriss" && (
        <GrundrissView
          data={typeAnalysis as unknown as WohnungsgrundrissAnalysis}
        />
      )}
      {documentType === "weg_protokolle" && (
        <WegProtokolleView
          data={typeAnalysis as unknown as WegProtokolleAnalysis}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TypeAnalysis }
