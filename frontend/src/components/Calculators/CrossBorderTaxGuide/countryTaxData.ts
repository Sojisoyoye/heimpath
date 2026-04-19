/**
 * Cross-Border Tax Guide Data
 * Static curated tax data for 10 countries with DBA treaty info
 */

import type {
  ICountryTaxData,
  IDbaInfo,
  IDeductibleExpense,
  IFilingRequirement,
  IResidentComparison,
  ITaxRate,
  IWithholdingRates,
} from "./types"

/******************************************************************************
                              Constants
******************************************************************************/

const COMMON_FILINGS: IFilingRequirement[] = [
  {
    formName: "ESt 1 C",
    description:
      "Income tax return for non-residents (beschränkt Steuerpflichtige)",
    deadline:
      "31 July of the following year (with advisor: end of February +1)",
  },
  {
    formName: "Anlage V",
    description: "Attachment for rental income and expenses",
    deadline: "Filed together with ESt 1 C",
  },
  {
    formName: "Anlage AUS",
    description: "Attachment for foreign income / DBA treaty relief",
    deadline: "Filed together with ESt 1 C",
  },
]

const COMMON_EXPENSES: IDeductibleExpense[] = [
  {
    category: "Depreciation (AfA)",
    description: "2% p.a. linear on building value (excluding land)",
    availableToNonResidents: true,
  },
  {
    category: "Mortgage Interest",
    description: "Interest on loans used to finance the property",
    availableToNonResidents: true,
  },
  {
    category: "Property Management",
    description: "Hausverwaltung fees, property manager costs",
    availableToNonResidents: true,
  },
  {
    category: "Maintenance & Repairs",
    description:
      "Instandhaltungskosten up to 15% of building value in first 3 years",
    availableToNonResidents: true,
  },
  {
    category: "Travel Expenses",
    description: "Trips to inspect or manage the property",
    availableToNonResidents: true,
  },
  {
    category: "Insurance",
    description: "Building insurance, liability insurance",
    availableToNonResidents: true,
  },
  {
    category: "Professional Fees",
    description: "Steuerberater, lawyer fees related to the property",
    availableToNonResidents: true,
  },
  {
    category: "Personal Allowance",
    description: "Grundfreibetrag (basic tax-free allowance, ~11,604 EUR)",
    availableToNonResidents: false,
  },
  {
    category: "Splitting Tariff",
    description: "Ehegattensplitting for married couples",
    availableToNonResidents: false,
  },
  {
    category: "Special Expenses",
    description: "Sonderausgaben (church tax, donations, etc.)",
    availableToNonResidents: false,
  },
]

const COMMON_DEADLINES: string[] = [
  "Tax year: 1 January - 31 December",
  "Filing deadline (self): 31 July of the following year",
  "Filing deadline (with Steuerberater): end of February, two years later",
  "Prepayment notices (Vorauszahlungsbescheid): quarterly on 10 Mar, 10 Jun, 10 Sep, 10 Dec",
]

const FLAT_RENTAL_RATE: ITaxRate = {
  rate: 0.15825,
  label: "15.825%",
  note: "15% + 5.5% Soli surcharge — flat rate for non-residents",
}

const FLAT_CG_RATE: ITaxRate = {
  rate: 0.15825,
  label: "15.825%",
  note: "Flat rate for non-residents",
}

const STANDARD_DIVIDENDS: ITaxRate = { rate: 0.26375, label: "26.375%" }

const DBA_DIVIDENDS_15: ITaxRate = {
  rate: 0.15,
  label: "15%",
  note: "DBA Article 10",
}

const DBA_DIVIDENDS_10: ITaxRate = {
  rate: 0.1,
  label: "10%",
  note: "DBA Article 10",
}

/******************************************************************************
                              Builder
******************************************************************************/

interface ICountryInput {
  code: string
  name: string
  flag: string
  dba: IDbaInfo
  capitalGainsNote?: string
  dbaReducedDividends: ITaxRate | null
  notes: string[]
}

function buildCountry(input: ICountryInput): ICountryTaxData {
  const withholding: IWithholdingRates = {
    rentalIncome: FLAT_RENTAL_RATE,
    capitalGains: input.capitalGainsNote
      ? { rate: 0.15825, label: "15.825%", note: input.capitalGainsNote }
      : FLAT_CG_RATE,
    dividends: STANDARD_DIVIDENDS,
    dbaReducedDividends: input.dbaReducedDividends,
  }

  return {
    code: input.code,
    name: input.name,
    flag: input.flag,
    dba: input.dba,
    withholding,
    filings: COMMON_FILINGS,
    expenses: COMMON_EXPENSES,
    deadlines: COMMON_DEADLINES,
    notes: input.notes,
  }
}

/******************************************************************************
                              Country Data
******************************************************************************/

export const COUNTRY_TAX_DATA: ICountryTaxData[] = [
  buildCountry({
    code: "GB",
    name: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    dba: {
      hasTreaty: true,
      treatyYear: 2010,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany has primary taxing right. UK grants credit for German tax paid.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. UK also taxes but grants credit.",
      notes:
        "Post-Brexit: DBA remains in force. UK residents file Self Assessment to claim foreign tax credit.",
    },
    capitalGainsNote: "Or progressive rate if higher — non-resident election",
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "UK HMRC allows you to claim Foreign Tax Credit Relief on your Self Assessment for German tax paid on rental income.",
      "No UK capital gains tax exemption for overseas property — but German DBA credit applies.",
      "Consider UK Non-Resident Landlord Scheme interactions if you also rent UK property.",
    ],
  }),
  buildCountry({
    code: "US",
    name: "United States",
    flag: "\u{1F1FA}\u{1F1F8}",
    dba: {
      hasTreaty: true,
      treatyYear: 1989,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. US grants Foreign Tax Credit (FTC) via Form 1116.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. US also taxes worldwide but grants FTC.",
      notes:
        "US citizens/residents must report worldwide income. FATCA reporting may apply for German bank accounts.",
    },
    capitalGainsNote: "Or progressive rate — whichever is elected",
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "US citizens must file IRS Form 1116 (Foreign Tax Credit) to avoid double taxation on German rental income.",
      "FBAR (FinCEN 114) filing required if German bank accounts exceed $10,000 aggregate.",
      "FATCA Form 8938 may be required for specified foreign financial assets above thresholds.",
    ],
  }),
  buildCountry({
    code: "FR",
    name: "France",
    flag: "\u{1F1EB}\u{1F1F7}",
    dba: {
      hasTreaty: true,
      treatyYear: 1959,
      reliefMethod: "exemption",
      rentalIncomeRule:
        "Germany has exclusive taxing right. France exempts but uses progression (taux effectif).",
      capitalGainsRule:
        "Germany taxes gains on immovable property. France exempts with progression.",
      notes:
        "Revised protocol 2015. France uses the exemption-with-progression method — German income raises your French tax bracket.",
    },
    dbaReducedDividends: {
      rate: 0.15,
      label: "15%",
      note: "DBA Article 9",
    },
    notes: [
      "France uses exemption-with-progression: German rental income is exempt in France but raises your effective French tax rate.",
      "You must still declare the German income on your French return (Form 2047) for progression calculation.",
      "Social contributions (CSG/CRDS) do not apply to income from German property for EU/EEA residents.",
    ],
  }),
  buildCountry({
    code: "NL",
    name: "Netherlands",
    flag: "\u{1F1F3}\u{1F1F1}",
    dba: {
      hasTreaty: true,
      treatyYear: 2012,
      reliefMethod: "exemption",
      rentalIncomeRule:
        "Germany has primary taxing right. Netherlands exempts with progression.",
      capitalGainsRule:
        "Germany taxes gains. Netherlands exempts with progression.",
      notes:
        "Dutch Box 3 (wealth tax) may still apply to the net value of foreign property. Treaty updated 2012.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "Netherlands exempts German rental income but your German property value is included in Box 3 (wealth tax).",
      "Dutch Box 3 tax is based on deemed return, not actual rental income — may result in additional Dutch tax.",
      "Claim proportional exemption in Dutch return to avoid double counting.",
    ],
  }),
  buildCountry({
    code: "TR",
    name: "Turkey",
    flag: "\u{1F1F9}\u{1F1F7}",
    dba: {
      hasTreaty: true,
      treatyYear: 2011,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. Turkey grants credit for German tax paid.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. Turkey grants credit.",
      notes:
        "Treaty entered into force 2012. Turkey applies credit method for all income types.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "Turkish residents must declare worldwide income including German rental income in their annual Turkish return.",
      "German tax paid can be credited against Turkish tax — keep Steuerbescheid as proof.",
      "Turkey has a rental income exemption threshold (~33,000 TRY) — German rental income may exceed this.",
    ],
  }),
  buildCountry({
    code: "PL",
    name: "Poland",
    flag: "\u{1F1F5}\u{1F1F1}",
    dba: {
      hasTreaty: true,
      treatyYear: 2003,
      reliefMethod: "exemption",
      rentalIncomeRule:
        "Germany taxes rental income. Poland exempts with progression.",
      capitalGainsRule: "Germany taxes gains. Poland exempts with progression.",
      notes:
        "Revised 2003 treaty uses exemption-with-progression method. Poland switched from credit to exemption.",
    },
    dbaReducedDividends: {
      rate: 0.05,
      label: "5%",
      note: "DBA Article 10 (company holding 25%+: 5%)",
    },
    notes: [
      "Poland exempts German rental income but includes it for calculating your effective Polish tax rate.",
      "Report German income on PIT-36 with attachment PIT/ZG for foreign income.",
      "Many Polish investors in Germany — established advisory infrastructure in both countries.",
    ],
  }),
  buildCountry({
    code: "IT",
    name: "Italy",
    flag: "\u{1F1EE}\u{1F1F9}",
    dba: {
      hasTreaty: true,
      treatyYear: 1989,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. Italy grants credit for German tax paid.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. Italy grants credit.",
      notes:
        "Treaty from 1989 with subsequent protocols. Italy uses credit method.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "Italian residents must declare German rental income on their Italian tax return (Redditi PF, Quadro CR).",
      "Credito d'imposta: German tax paid is credited against Italian IRPEF on the same income.",
      "Italian IVIE tax (0.76% of cadastral value) applies to foreign property — may add to total tax burden.",
    ],
  }),
  buildCountry({
    code: "CN",
    name: "China",
    flag: "\u{1F1E8}\u{1F1F3}",
    dba: {
      hasTreaty: true,
      treatyYear: 2014,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. China grants credit for German tax paid.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. China grants credit.",
      notes:
        "Revised treaty 2014. China applies credit method. Foreign exchange controls may affect repatriation.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_10,
    notes: [
      "Chinese forex controls (SAFE) limit outbound transfers — plan acquisition funding carefully.",
      "Chinese residents must report worldwide income; credit for German tax paid via annual IIT filing.",
      "Consider using a Hong Kong or Singapore entity for structuring — consult cross-border tax advisor.",
    ],
  }),
  buildCountry({
    code: "RU",
    name: "Russia",
    flag: "\u{1F1F7}\u{1F1FA}",
    dba: {
      hasTreaty: true,
      treatyYear: 1996,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. Russia grants credit for German tax paid.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. Russia grants credit.",
      notes:
        "DBA from 1996 remains technically in force. Practical enforcement may be affected by sanctions — consult advisor.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_15,
    notes: [
      "EU sanctions may restrict banking and payment flows — verify current sanctions list before transactions.",
      "DBA treaty technically applies but practical credit claims may face administrative hurdles.",
      "Russian residents taxed at 13% (15% above 5M RUB) on worldwide income — German credit may cover most or all.",
    ],
  }),
  buildCountry({
    code: "IN",
    name: "India",
    flag: "\u{1F1EE}\u{1F1F3}",
    dba: {
      hasTreaty: true,
      treatyYear: 1995,
      reliefMethod: "credit",
      rentalIncomeRule:
        "Germany taxes rental income at source. India grants credit for German tax paid under Section 91.",
      capitalGainsRule:
        "Germany taxes gains on immovable property. India grants credit.",
      notes:
        "Treaty from 1995. India uses credit method. LRS (Liberalised Remittance Scheme) limits outbound investment to $250,000/year.",
    },
    dbaReducedDividends: DBA_DIVIDENDS_10,
    notes: [
      "LRS limit of $250,000/year per person for outbound investment — plan property acquisition accordingly.",
      "Indian residents must report foreign assets on Schedule FA of ITR; non-compliance attracts penalties.",
      "Section 91 relief: credit for German tax paid on rental income, limited to Indian tax on the same income.",
    ],
  }),
]

/******************************************************************************
                              Resident vs Non-Resident Comparison
******************************************************************************/

export const RESIDENT_VS_NON_RESIDENT: IResidentComparison[] = [
  {
    aspect: "Tax Filing Form",
    residentTreatment: "ESt 1 A (full return with all income)",
    nonResidentTreatment: "ESt 1 C (limited return, German-source income only)",
    favored: "neutral",
  },
  {
    aspect: "Tax Rate",
    residentTreatment: "Progressive rate 14%-45% on worldwide income",
    nonResidentTreatment:
      "Flat 15.825% on rental income, or progressive rate election",
    favored: "non-resident",
  },
  {
    aspect: "Basic Allowance (Grundfreibetrag)",
    residentTreatment: "~11,604 EUR tax-free",
    nonResidentTreatment:
      "Not available (unless 90% of income is from Germany)",
    favored: "resident",
  },
  {
    aspect: "Depreciation (AfA)",
    residentTreatment: "2% linear on building value",
    nonResidentTreatment: "2% linear on building value (same)",
    favored: "neutral",
  },
  {
    aspect: "Mortgage Interest Deduction",
    residentTreatment: "Fully deductible against rental income",
    nonResidentTreatment: "Fully deductible against rental income (same)",
    favored: "neutral",
  },
  {
    aspect: "Loss Offset",
    residentTreatment: "Losses offset against other income types",
    nonResidentTreatment:
      "Losses only offset within German income; no cross-border offset",
    favored: "resident",
  },
  {
    aspect: "Capital Gains (< 10 years)",
    residentTreatment: "Taxed at personal rate",
    nonResidentTreatment: "Taxed at 15.825% flat or progressive election",
    favored: "non-resident",
  },
  {
    aspect: "Capital Gains (10+ years)",
    residentTreatment: "Tax-free (Spekulationsfrist)",
    nonResidentTreatment: "Tax-free (Spekulationsfrist applies equally)",
    favored: "neutral",
  },
]
