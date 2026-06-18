/**
 * Bank Account Guide Page
 * How to open a German bank account as a non-resident or foreign buyer
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BarChart2,
  Building2,
  CheckCircle2,
  ExternalLink,
  Landmark,
} from "lucide-react"
import { seoMeta } from "@/common/seo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/bank-account-guide")({
  component: BankAccountGuidePage,
  head: () => ({
    ...seoMeta({
      title:
        "German Bank Account for Non-Residents & Foreign Buyers - HeimPath",
      description:
        "How to open a German bank account as a foreign buyer or non-resident. Compare N26, DKB, Deutsche Bank and Commerzbank, required documents, and step-by-step process.",
      path: "/bank-account-guide",
    }),
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

interface IBankProfile {
  name: string
  badge: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
  accepts: string
  acceptsColor: string
  accountFee: string
  timeToOpen: string
  englishSupport: string
  process: string
  notes: string
}

const BANK_PROFILES: IBankProfile[] = [
  {
    name: "N26",
    badge: "EU only",
    badgeVariant: "default",
    accepts: "EU / EEA residents",
    acceptsColor: "text-green-600",
    accountFee: "€0 – €16.90/mo",
    timeToOpen: "5–10 min (VideoIdent)",
    englishSupport: "Full English app",
    process: "100% online — VideoIdent via smartphone",
    notes:
      "Best for EU residents. No branch visits. Free tier available. Non-EU applicants and non-residents are not accepted.",
  },
  {
    name: "DKB (Deutsche Kreditbank)",
    badge: "EU residents only",
    badgeVariant: "default",
    accepts: "EU residents with Anmeldung",
    acceptsColor: "text-green-600",
    accountFee: "€0 (free)",
    timeToOpen: "1–3 business days",
    englishSupport: "German only",
    process: "Online application + PostIdent at a post office",
    notes:
      "Free current account with Visa card. Requires a registered German address (Anmeldung). Good for EU residents already in Germany.",
  },
  {
    name: "Deutsche Bank",
    badge: "Non-EU accepted",
    badgeVariant: "secondary",
    accepts: "EU and non-EU, residents and non-residents",
    acceptsColor: "text-amber-600",
    accountFee: "€5.90 – €12.90/mo",
    timeToOpen: "1–2 weeks (branch appointment)",
    englishSupport: "English available in major cities",
    process: "Branch appointment required for non-residents",
    notes:
      "One of the few major banks accepting non-residents. Appointment required. Processing for non-EU non-residents can take 2–4 weeks due to KYC checks.",
  },
  {
    name: "Commerzbank",
    badge: "Non-EU accepted",
    badgeVariant: "secondary",
    accepts: "EU and non-EU, residents and non-residents",
    acceptsColor: "text-amber-600",
    accountFee: "€0 – €12.90/mo",
    timeToOpen: "1–2 weeks (branch appointment)",
    englishSupport: "English available in major cities",
    process: "Branch appointment; online possible for EU residents",
    notes:
      "Wide branch network across Germany. Free tier available for salary accounts. Non-residents should book an appointment in advance and bring full documentation.",
  },
]

interface IDocumentRequirement {
  citizenshipType: string
  badge: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
  documents: string[]
}

const DOCUMENT_REQUIREMENTS: IDocumentRequirement[] = [
  {
    citizenshipType: "EU / EEA Citizen",
    badge: "Easiest",
    badgeVariant: "default",
    documents: [
      "Valid EU/EEA passport or national ID",
      "German address (Anmeldebestätigung) — for DKB, Volksbank, etc.",
      "Tax ID (Steueridentifikationsnummer) — optional but speeds up process",
    ],
  },
  {
    citizenshipType: "Non-EU Resident in Germany",
    badge: "Moderate",
    badgeVariant: "secondary",
    documents: [
      "Passport",
      "Valid Aufenthaltstitel (residence permit)",
      "Anmeldebestätigung (registered address certificate)",
      "German tax ID (Steueridentifikationsnummer)",
      "Proof of income or employment contract",
    ],
  },
  {
    citizenshipType: "Non-EU Non-Resident (Foreign Buyer)",
    badge: "Requires planning",
    badgeVariant: "destructive",
    documents: [
      "Passport (certified copy may be required)",
      "German tax ID (Steueridentifikationsnummer) — apply via Finanzamt",
      "Proof of purpose: purchase agreement, notary correspondence",
      "Last 3 months' bank statements from home country",
      "Proof of income (payslips or tax returns)",
      "Home country address proof",
    ],
  },
]

const PROCESS_STEPS = [
  {
    step: 1,
    title: "Get your German tax ID",
    duration: "2–6 weeks",
    description:
      "Apply at your local Finanzamt (tax office) or, for non-residents, via the Bundeszentralamt für Steuern. The Steueridentifikationsnummer is required by most banks and is also needed for property ownership.",
  },
  {
    step: 2,
    title: "Choose a bank and apply",
    duration: "1 day",
    description:
      "EU residents: apply online at N26 or DKB — VideoIdent or PostIdent verification takes minutes. Non-EU or non-residents: book a branch appointment at Deutsche Bank or Commerzbank. Allow 2–4 weeks lead time.",
  },
  {
    step: 3,
    title: "Complete identity verification",
    duration: "1–3 days",
    description:
      "VideoIdent: video call with a verification agent via your smartphone. PostIdent: visit any Deutsche Post branch with your documents. Branch: in-person appointment. Non-residents typically need PostIdent or branch.",
  },
  {
    step: 4,
    title: "Receive your IBAN and card",
    duration: "5–14 business days",
    description:
      "Once verified, your IBAN arrives by post or email. The debit/credit card follows within 7–10 business days. You can share your IBAN with your notary and mortgage lender immediately upon receipt.",
  },
]

/******************************************************************************
                              Components
******************************************************************************/

interface IBankCardProps {
  bank: IBankProfile
}

function BankCard({ bank }: Readonly<IBankCardProps>) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{bank.name}</CardTitle>
          <Badge variant={bank.badgeVariant} className="shrink-0 text-xs">
            {bank.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Accepts
            </p>
            <p className={`font-medium ${bank.acceptsColor}`}>{bank.accepts}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Account fee
            </p>
            <p className="font-medium">{bank.accountFee}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Time to open
            </p>
            <p className="font-medium">{bank.timeToOpen}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              English support
            </p>
            <p className="font-medium">{bank.englishSupport}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Process
            </p>
            <p className="font-medium">{bank.process}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{bank.notes}</p>
      </CardContent>
    </Card>
  )
}

interface IDocumentCardProps {
  requirement: IDocumentRequirement
}

function DocumentCard({ requirement }: Readonly<IDocumentCardProps>) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {requirement.citizenshipType}
          </CardTitle>
          <Badge
            variant={requirement.badgeVariant}
            className="shrink-0 text-xs"
          >
            {requirement.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {requirement.documents.map((doc) => (
            <li key={doc} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
              <span>{doc}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** CTA cards linking to related guides and tools. */
function BankAccountGuideCtas() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <p className="font-semibold">Mortgage guide for foreign buyers</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Understand mortgage eligibility, LTV limits, and required documents
            based on your residency status.
          </p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <Link to="/mortgage-guide">View mortgage guide</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            <p className="font-semibold">Pre-qualify for a mortgage</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Hypofriend specialises in German mortgages for international buyers
            and provides binding pre-approvals online.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-auto w-fit border-blue-300 bg-white dark:bg-transparent"
          >
            <a
              href="https://www.hypofriend.de"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Visit Hypofriend
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 sm:col-span-2">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold">
                Still deciding whether to buy or rent?
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Compare the true long-term cost of buying versus renting —
              including closing costs, equity, and investment opportunity cost.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-fit shrink-0 border-green-300 bg-white dark:bg-transparent"
          >
            <Link to="/tools/rent-vs-buy-calculator">
              <BarChart2 className="mr-1.5 h-4 w-4" />
              Rent vs. Buy Calculator
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

/** Default component. German bank account guide for foreign buyers. */
function BankAccountGuidePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6" />
          German Bank Account for Foreign Buyers
        </h1>
        <p className="mt-1 text-muted-foreground">
          A German IBAN is required to receive mortgage disbursements, pay
          notary fees, and set up property-related direct debits. This guide
          explains which banks accept non-residents and how to open an account
          before your purchase.
        </p>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Start early — allow 4–8 weeks
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          Non-EU non-residents should begin the bank account process as soon as
          they decide to buy. Banks require a German tax ID (2–6 weeks to
          obtain) and KYC checks add further time. Running this in parallel with
          your property search avoids delays at the notary appointment.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Bank Comparison</h2>
        <p className="text-sm text-muted-foreground">
          Most German banks only accept residents with a registered address
          (Anmeldung). The four banks below are the most accessible options for
          foreign buyers.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {BANK_PROFILES.map((bank) => (
            <BankCard key={bank.name} bank={bank} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Required Documents</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {DOCUMENT_REQUIREMENTS.map((req) => (
            <DocumentCard key={req.citizenshipType} requirement={req} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Opening Process</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((s) => (
            <div key={s.step} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.step}
                </span>
                <p className="font-medium">{s.title}</p>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{s.duration}</p>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <BankAccountGuideCtas />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default BankAccountGuidePage
