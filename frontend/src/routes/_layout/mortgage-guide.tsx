/**
 * Mortgage Guide Page
 * Educational guide for German mortgage eligibility by residency status
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BarChart2,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Landmark,
} from "lucide-react"
import AffordabilityCalculator from "@/components/MortgageGuide/AffordabilityCalculator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/mortgage-guide")({
  component: MortgageGuidePage,
  head: () => ({
    meta: [{ title: "Mortgage Guide for Foreign Buyers - HeimPath" }],
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

interface IResidencyProfile {
  label: string
  badge: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
  ltv: string
  downPayment: string
  bankAccess: string
  bankAccessColor: string
  notes: string
  documents: string[]
}

const RESIDENCY_PROFILES: IResidencyProfile[] = [
  {
    label: "German Citizen",
    badge: "Best access",
    badgeVariant: "default",
    ltv: "Up to 100% (typically 80–90%)",
    downPayment: "10–20%",
    bankAccess: "All German banks",
    bankAccessColor: "text-green-600",
    notes:
      "Full Schufa scoring applies. Most favourable rates and LTV ratios. Buyers with low Schufa scores still face restrictions.",
    documents: [
      "Personalausweis or passport",
      "Schufa Bonitätsauskunft",
      "Last 3 months' payslips",
      "Last 2 years' tax assessments",
      "3 months' bank statements",
      "Employment contract",
    ],
  },
  {
    label: "EU / EEA Citizen",
    badge: "Good access",
    badgeVariant: "default",
    ltv: "70–80%",
    downPayment: "20–30%",
    bankAccess: "Most major banks",
    bankAccessColor: "text-green-600",
    notes:
      "Must have German Anmeldung (registered residence) and stable German employment. Foreign income accepted with additional documentation.",
    documents: [
      "EU/EEA passport",
      "Anmeldebestätigung (residence registration)",
      "Last 3 months' payslips",
      "Employment contract (permanent preferred)",
      "Schufa or equivalent credit report",
      "3 months' bank statements",
    ],
  },
  {
    label: "Non-EU Resident in Germany",
    badge: "Limited access",
    badgeVariant: "secondary",
    ltv: "60–70%",
    downPayment: "30–40%",
    bankAccess: "Specialist lenders",
    bankAccessColor: "text-amber-600",
    notes:
      "Niederlassungserlaubnis (permanent residence) or at least 2 years on a stable Aufenthaltstitel required. Some banks exclude certain nationalities. Longer processing times typical.",
    documents: [
      "Passport",
      "Valid Aufenthaltstitel (5+ years preferred, or Niederlassungserlaubnis)",
      "Anmeldebestätigung",
      "Last 3 months' payslips",
      "Employment contract (min. 2 years remaining)",
      "Schufa or credit report",
      "3 months' bank statements",
      "Last 2 years' tax assessments",
    ],
  },
  {
    label: "Non-Resident (Foreign Buyer)",
    badge: "Restricted access",
    badgeVariant: "destructive",
    ltv: "50–60%",
    downPayment: "40–50%",
    bankAccess: "Very few specialist banks",
    bankAccessColor: "text-red-600",
    notes:
      "Very limited options. Berlin Hyp, DZ Bank, and some Volksbank branches work with non-residents. A German tax ID (Steueridentifikationsnummer) is required. Expect higher interest rates and more stringent income documentation.",
    documents: [
      "Passport",
      "German tax ID (Steueridentifikationsnummer)",
      "Last 3 years' tax returns (home country)",
      "Proof of foreign income (payslips or business accounts)",
      "3 months' bank statements",
      "Independent property valuation report (Gutachten)",
      "Proof of existing assets / equity",
    ],
  },
]

const PROCESS_STEPS = [
  {
    step: 1,
    title: "Pre-qualification",
    duration: "1–2 weeks",
    description:
      "Gather documents, obtain Schufa report, and get an initial mortgage pre-qualification from a broker or bank. This gives you a realistic budget before you start searching.",
  },
  {
    step: 2,
    title: "Formal application",
    duration: "4–8 weeks",
    description:
      "Submit full documentation to the lender. Bank orders a property valuation (Beleihungswertermittlung). Binding mortgage offer (Darlehensangebot) issued after approval.",
  },
  {
    step: 3,
    title: "Notarisation & drawdown",
    duration: "2–4 weeks",
    description:
      "Purchase contract signed at a notary (Notar). Mortgage drawdown triggered on the Fälligkeitsdatum — typically 2–6 weeks after notarisation. Land register (Grundbuch) update follows.",
  },
]

/******************************************************************************
                              Components
******************************************************************************/

interface IResidencyCardProps {
  profile: IResidencyProfile
}

function ResidencyCard({ profile }: Readonly<IResidencyCardProps>) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{profile.label}</CardTitle>
          <Badge variant={profile.badgeVariant} className="shrink-0 text-xs">
            {profile.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Max LTV
            </p>
            <p className="font-medium">{profile.ltv}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Down payment
            </p>
            <p className="font-medium">{profile.downPayment}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bank access
            </p>
            <p className={`font-medium ${profile.bankAccessColor}`}>
              {profile.bankAccess}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{profile.notes}</p>

        <div className="mt-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Required documents
          </p>
          <ul className="space-y-1">
            {profile.documents.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/** CTA cards linking to the affordability calculator and Hypofriend pre-approval. */
function MortgageGuideCtas() {
  function scrollToCalculator() {
    document
      .getElementById("affordability-calculator")
      ?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="font-semibold">Calculate your affordability</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your income and savings to get a personalised estimate of the
            maximum property price and monthly payment.
          </p>
          <Button
            size="sm"
            className="mt-auto w-fit"
            onClick={scrollToCalculator}
          >
            Try the calculator
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <p className="font-semibold">Get a binding pre-approval</p>
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
                Still unsure? Run a rent vs. buy comparison
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Compare the true long-term cost of buying versus renting —
              accounting for equity, closing costs, and what your down payment
              could earn if invested instead.
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

/** Default component. German mortgage guide for foreign buyers. */
function MortgageGuidePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Landmark className="h-6 w-6" />
          German Mortgage Guide for Foreign Buyers
        </h1>
        <p className="mt-1 text-muted-foreground">
          Understand mortgage eligibility, required documents, and the
          application process based on your residency status. You'll also need a
          German bank account before mortgage disbursement —{" "}
          <Link
            to="/bank-account-guide"
            className="underline underline-offset-4 hover:text-foreground"
          >
            see the bank account guide
          </Link>
          .
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Eligibility by Residency Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RESIDENCY_PROFILES.map((profile) => (
            <ResidencyCard key={profile.label} profile={profile} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Typical Mortgage Process</h2>
        <div className="grid gap-4 sm:grid-cols-3">
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

      <section id="affordability-calculator" className="space-y-4">
        <h2 className="text-lg font-semibold">Affordability Calculator</h2>
        <AffordabilityCalculator />
      </section>

      <MortgageGuideCtas />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default MortgageGuidePage
