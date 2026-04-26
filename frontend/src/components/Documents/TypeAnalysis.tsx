/**
 * Type Analysis Component
 * AI-generated structured analysis for Grundbuchauszug, Teilungserklärung,
 * Mietvertrag, and Wohnungsgrundriss document types
 */

import { Bot } from "lucide-react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DocumentType,
  GrundbuchAnalysis,
  MietvertragAnalysis,
  RiskFlag,
  TeilungserklaerungAnalysis,
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
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TypeAnalysis }
