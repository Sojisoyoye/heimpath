/**
 * Mortgage Eligibility Data
 * Static eligibility profiles for non-citizen mortgage applicants in Germany.
 * Data sourced from BaFin guidelines, Stiftung Warentest, and lender policy research.
 */

import type {
  EligibilityStatus,
  IEligibilityProfile,
  NationalityGroup,
} from "./types"

/******************************************************************************
                              Constants
******************************************************************************/

export const NATIONALITY_GROUP_LABELS: Record<NationalityGroup, string> = {
  eu_eea: "EU / EEA citizen",
  non_eu_permanent:
    "Non-EU with permanent residence (Niederlassungserlaubnis, 3+ years)",
  non_eu_limited: "Non-EU with limited visa (Aufenthaltstitel < 3 years)",
  non_resident: "Non-resident (living abroad, no German Anmeldung)",
}

export const STATUS_LABELS: Record<EligibilityStatus, string> = {
  easy: "Generally Accessible",
  conditional: "Conditionally Accessible",
  difficult: "Difficult — Specialist Lender Needed",
  not_available: "Not Available",
}

export const STATUS_STYLES: Record<EligibilityStatus, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  conditional:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  difficult:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  not_available: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export const LENDER_STATUS_STYLES: Record<EligibilityStatus, string> = {
  easy: "text-green-700 dark:text-green-400",
  conditional: "text-yellow-700 dark:text-yellow-400",
  difficult: "text-orange-700 dark:text-orange-400",
  not_available: "text-red-600 dark:text-red-400",
}

/******************************************************************************
                              Eligibility Profiles
******************************************************************************/

export const ELIGIBILITY_PROFILES: Record<
  NationalityGroup,
  IEligibilityProfile
> = {
  eu_eea: {
    overallStatus: "easy",
    summary:
      "As an EU/EEA citizen you are treated almost identically to German nationals. Freedom of movement means banks cannot discriminate based on nationality alone. Most mainstream lenders — including Sparkassen, online banks, and private banks — will consider your application on the same terms as a German applicant.",
    keyRequirements: [
      "Valid EU/EEA passport or national ID",
      "German Anmeldung (registered address)",
      "At least 3 months of German payslips or 2 years of tax returns (self-employed)",
      "Schufa credit report (or equivalent from home country if recently arrived)",
      "Property must be in Germany (foreign collateral not accepted)",
    ],
    employmentNotes: {
      employed: [],
      self_employed: [
        "Most lenders require 2–3 years of certified tax returns (Einkommensteuerbescheide).",
        "Average income over 3 years is used — not the highest single year.",
      ],
      freelance: [
        "Treat as self-employed: 2–3 years of tax returns required.",
        "Irregular income may reduce the LTV offered by some Sparkassen.",
      ],
      non_german_income: [
        "Income in EUR is straightforward; foreign currency income requires conversion at a haircut (typically 20–30%).",
        "Some online banks (ING, DKB) restrict to income received in a German bank account.",
      ],
    },
    rentalNote:
      "Rental investment properties are typically financed at a 5–10% lower LTV than primary residences. Expected rental income can partially count toward affordability assessment.",
    lenders: [
      {
        lenderType: "Sparkasse / Volksbank",
        lenderExamples: "Local savings & cooperative banks",
        eligibility: "easy",
        maxLtv: 80,
        minDownPayment: 20,
        notes: [
          "Strong preference for local applicants with German address.",
          "Relationship banking — visit a branch in person for best results.",
        ],
      },
      {
        lenderType: "Private banks",
        lenderExamples: "Deutsche Bank, Commerzbank, Hypovereinsbank",
        eligibility: "easy",
        maxLtv: 80,
        minDownPayment: 20,
        notes: [
          "Online application available; branch visit may still be required for signing.",
        ],
      },
      {
        lenderType: "Online banks",
        lenderExamples: "ING-DiBa, DKB, Interhyp (broker)",
        eligibility: "easy",
        maxLtv: 85,
        minDownPayment: 15,
        notes: [
          "Interhyp is a broker comparing 500+ lenders — highly recommended for rate shopping.",
          "ING-DiBa offers up to 85% LTV for strong profiles.",
        ],
      },
      {
        lenderType: "International / specialist brokers",
        lenderExamples: "DSL Bank, PlanetHome, independent mortgage brokers",
        eligibility: "easy",
        maxLtv: 80,
        minDownPayment: 20,
        notes: [
          "Specialist brokers can navigate complex income structures (e.g. bonus-heavy pay).",
        ],
      },
    ],
  },

  non_eu_permanent: {
    overallStatus: "conditional",
    summary:
      "With a Niederlassungserlaubnis (permanent settlement permit) or the EU long-term residence permit, you are considered a strong candidate by most lenders. The key requirement is demonstrating long-term ties to Germany through stable employment and at least 3 years of German tax history. Expect a slightly higher down payment than German citizens.",
    keyRequirements: [
      "Niederlassungserlaubnis or EU Daueraufenthaltserlaubnis (permanent permit)",
      "Minimum 3 years of German employment / tax history",
      "German Anmeldung and Steueridentifikationsnummer",
      "Schufa credit report (clean — no negative entries)",
      "Stable income from a German employer or 3 years of self-employment tax returns",
      "Minimum 25–30% down payment is typically required",
    ],
    employmentNotes: {
      employed: [
        "Permanent (unbefristeter) employment contract significantly strengthens your application.",
        "Fixed-term contracts may be acceptable if you can show 3+ years of stable employment history.",
      ],
      self_employed: [
        "3 years of Einkommensteuerbescheide required — lenders use the lowest of the 3 years.",
        "Seek specialist brokers familiar with non-EU self-employed profiles.",
      ],
      freelance: [
        "Treated same as self-employed; 3 years of tax returns required.",
        "High variance in income will be scrutinised — show consistent profitability.",
      ],
      non_german_income: [
        "Foreign income in EUR is typically accepted at 70–80% of face value.",
        "Income in non-EUR currencies is heavily discounted (50–70%); some lenders exclude it entirely.",
        "Specialist brokers (e.g. PlanetHome) handle cross-border income best.",
      ],
    },
    rentalNote:
      "Rental properties are financeable but typically at 60–65% LTV. Lenders want at least 35–40% equity on investment properties for non-EU applicants.",
    lenders: [
      {
        lenderType: "Sparkasse / Volksbank",
        lenderExamples: "Local savings & cooperative banks",
        eligibility: "conditional",
        maxLtv: 70,
        minDownPayment: 30,
        notes: [
          "Local Sparkassen vary widely — some actively finance non-EU residents, others don't.",
          "In-branch relationship is critical; bring all documents translated into German.",
        ],
      },
      {
        lenderType: "Private banks",
        lenderExamples: "Deutsche Bank, Commerzbank, Hypovereinsbank",
        eligibility: "conditional",
        maxLtv: 70,
        minDownPayment: 30,
        notes: [
          "More standardised underwriting — decision based on income ratios, not local relationship.",
        ],
      },
      {
        lenderType: "Online banks",
        lenderExamples: "ING-DiBa, DKB, Interhyp (broker)",
        eligibility: "conditional",
        maxLtv: 70,
        minDownPayment: 30,
        notes: [
          "ING and DKB accept non-EU applicants with permanent residence.",
          "Interhyp (broker) is the most efficient route — compares lenders that work with non-EU profiles.",
        ],
      },
      {
        lenderType: "International / specialist brokers",
        lenderExamples: "DSL Bank, PlanetHome, Baufi24",
        eligibility: "conditional",
        maxLtv: 70,
        minDownPayment: 30,
        notes: [
          "Specialist brokers have relationships with lenders that actively seek non-EU applicants.",
        ],
      },
    ],
  },

  non_eu_limited: {
    overallStatus: "difficult",
    summary:
      "With a time-limited Aufenthaltstitel (residence permit), German banks face elevated risk because the permit could theoretically not be renewed. Most local banks will decline. Private banks and specialist brokers can still finance you — but expect higher down payment requirements (35–40%) and fewer lenders. Your chances improve significantly if you can show 3+ years of German tax history and a high, stable income.",
    keyRequirements: [
      "Valid Aufenthaltstitel — renewable permit type preferred (e.g. Blaue Karte EU, skilled worker permit)",
      "Minimum 2–3 years of German employment and tax history",
      "Clean Schufa score with German credit history",
      "Minimum 35–40% down payment",
      "High, stable income — typically min. €70–100k gross/year expected by private banks",
      "Letter from employer confirming continued employment (if employed)",
    ],
    employmentNotes: {
      employed: [
        "Employer confirmation letter (Arbeitgeberbescheinigung) stating that employment is expected to continue is essential.",
        "Blue Card (Blaue Karte EU) holders are viewed more favourably due to the clear renewal pathway.",
      ],
      self_employed: [
        "Very difficult — limited visa + self-employment is the hardest profile for German banks.",
        "Specialist international brokers are your only realistic option.",
        "3 years of tax returns required at minimum; 5 years is better.",
      ],
      freelance: [
        "Same challenges as self-employed. Very few lenders will engage.",
        "A larger down payment (50%+) significantly improves access.",
      ],
      non_german_income: [
        "Foreign income is typically excluded or heavily discounted by German lenders.",
        "If income is from a German subsidiary or paid into a German account, some lenders accept it.",
      ],
    },
    rentalNote:
      "Investment properties are rarely financed for non-EU applicants on limited visas. If attempted, expect 40–50% down payment and significantly higher interest rates.",
    lenders: [
      {
        lenderType: "Sparkasse / Volksbank",
        lenderExamples: "Local savings & cooperative banks",
        eligibility: "not_available",
        maxLtv: null,
        minDownPayment: null,
        notes: [
          "Most local savings banks decline applicants on limited visas as a blanket policy.",
          "Exceptions may exist in large cities — worth asking, but do not rely on this.",
        ],
      },
      {
        lenderType: "Private banks",
        lenderExamples: "Deutsche Bank, Commerzbank, Hypovereinsbank",
        eligibility: "conditional",
        maxLtv: 65,
        minDownPayment: 35,
        notes: [
          "Case-by-case — high income and excellent Schufa are non-negotiable.",
          "Relationship manager at a large branch gives best results.",
        ],
      },
      {
        lenderType: "Online banks",
        lenderExamples: "ING-DiBa, DKB, Interhyp (broker)",
        eligibility: "difficult",
        maxLtv: 60,
        minDownPayment: 40,
        notes: [
          "Standard online applications are usually rejected automatically.",
          "Via Interhyp or a specialist broker, a subset of their lender panel may still consider you.",
        ],
      },
      {
        lenderType: "International / specialist brokers",
        lenderExamples: "PlanetHome, Baufi24, expat mortgage specialists",
        eligibility: "conditional",
        maxLtv: 65,
        minDownPayment: 35,
        notes: [
          "Best route — specialist brokers know which lenders actively work with limited-visa applicants.",
          "Fees may be higher but access is significantly better than going direct.",
        ],
      },
    ],
  },

  non_resident: {
    overallStatus: "difficult",
    summary:
      "Financing German property while living abroad (no German Anmeldung) is the most challenging scenario. Most German retail banks require a German address. A small number of private banks and international specialist lenders will consider non-resident investors — typically requiring 40–50% down payment, income documentation, and a German Steueridentifikationsnummer. Rental income property is more financeable than primary residence for non-residents.",
    keyRequirements: [
      "German Steueridentifikationsnummer (tax ID — apply via Bundeszentralamt für Steuern)",
      "German bank account (several banks allow non-resident accounts: Deutsche Bank, N26 with ID verification)",
      "Comprehensive income documentation in German or English",
      "40–50% down payment",
      "Evidence of asset base (bank statements, investment portfolio)",
      "German tax filing history if any prior German income exists",
    ],
    employmentNotes: {
      employed: [
        "Employment letter in English or German from your employer is required.",
        "Income must be verifiable via bank statements — 12 months minimum.",
      ],
      self_employed: [
        "Certified financial statements required — ideally prepared or verified by a recognised accounting firm.",
        "Home-country tax returns may be accepted if translated and apostilled.",
      ],
      freelance: [
        "Very difficult; non-resident freelance income is rarely accepted by German lenders.",
        "Consider restructuring via a company entity if the investment is large.",
      ],
      non_german_income: [
        "All income will be treated as foreign — expect a 20–30% haircut on EUR income, more on other currencies.",
        "DBA treaty between your home country and Germany can affect how rental income is taxed.",
      ],
    },
    rentalNote:
      "Rental investment is the more common use case for non-residents, and some lenders (especially private banks) will specifically finance income-producing properties. Expected rental income typically counts 70–80% toward affordability.",
    lenders: [
      {
        lenderType: "Sparkasse / Volksbank",
        lenderExamples: "Local savings & cooperative banks",
        eligibility: "not_available",
        maxLtv: null,
        minDownPayment: null,
        notes: [
          "Sparkassen require German Anmeldung. Non-residents are uniformly declined.",
        ],
      },
      {
        lenderType: "Private banks",
        lenderExamples:
          "Deutsche Bank Private Banking, BNP Paribas, HSBC Germany",
        eligibility: "conditional",
        maxLtv: 55,
        minDownPayment: 45,
        notes: [
          "Private banking clients (typically €500k+ assets) may access non-resident mortgages.",
          "BNP Paribas and HSBC have specific non-resident mortgage products for investment properties.",
        ],
      },
      {
        lenderType: "Online banks",
        lenderExamples: "ING-DiBa, DKB",
        eligibility: "not_available",
        maxLtv: null,
        minDownPayment: null,
        notes: [
          "Online retail banks universally require German Anmeldung.",
          "Not an option for non-residents.",
        ],
      },
      {
        lenderType: "International / specialist brokers",
        lenderExamples:
          "German Mortgage International, expat finance specialists",
        eligibility: "conditional",
        maxLtv: 55,
        minDownPayment: 45,
        notes: [
          "Specialist international mortgage brokers are the primary route for non-residents.",
          "They work with a network of private lenders that specifically target non-resident investors.",
          "Expect higher arrangement fees and interest rate premiums of 0.5–1.5% above resident rates.",
        ],
      },
    ],
  },
}
