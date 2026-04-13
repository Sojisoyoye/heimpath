/**
 * PDF generation utility for Property Evaluation reports
 * Uses jsPDF + jspdf-autotable for branded report output
 */

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type {
  EvaluationResults,
  PropertyEvaluationState,
} from "@/models/propertyEvaluation"

/******************************************************************************
                              Constants
******************************************************************************/

const BRAND_BLUE = [30, 64, 175] as const // #1e40af
const TEXT_DARK = [17, 24, 39] as const // #111827
const TEXT_MUTED = [107, 114, 128] as const // #6b7280
const GREEN = [22, 163, 74] as const // #16a34a
const RED = [220, 38, 38] as const // #dc2626
const PAGE_MARGIN = 20
const CONTENT_WIDTH = 170 // A4 width (210) minus 2 * margin

/******************************************************************************
                              Functions
******************************************************************************/

/** Format a number as EUR currency string. */
function eur(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a number as EUR with 2 decimal places. */
function eur2(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format a number as percentage. */
function pct(value: number): string {
  return `${value.toFixed(2)} %`
}

/** Format a decimal as percentage (e.g. 0.042 -> "4.20 %"). */
function pctFromDecimal(value: number): string {
  return `${(value * 100).toFixed(2)} %`
}

/** Format a number as a factor (e.g. 33.15x). */
function factor(value: number): string {
  return `${value.toFixed(1)}x`
}

/** Add branded header to the PDF. */
function addHeader(doc: jsPDF, address: string, date: string): number {
  let y = PAGE_MARGIN

  // Blue square logo with "H"
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(PAGE_MARGIN, y, 12, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("H", PAGE_MARGIN + 4.2, y + 8.5)

  // Title
  doc.setTextColor(...TEXT_DARK)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("HeimPath", PAGE_MARGIN + 16, y + 5)

  // Subtitle
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text("Property Evaluation Report", PAGE_MARGIN + 16, y + 11)

  y += 18

  // Address and date
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  if (address) {
    doc.text(address, PAGE_MARGIN, y)
    y += 5
  }
  doc.text(`Generated: ${date}`, PAGE_MARGIN, y)
  y += 4

  // Blue divider
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.8)
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y)
  y += 6

  return y
}

/** Add the cashflow highlight box. */
function addCashflowHighlight(
  doc: jsPDF,
  results: EvaluationResults,
  y: number,
): number {
  const boxHeight = 18
  const isPositive = results.monthlyCashflowAfterTax >= 0
  const color: [number, number, number] = isPositive ? [...GREEN] : [...RED]

  // Border box
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(0.6)
  doc.setFillColor(255, 255, 255)
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, "S")

  // Label
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text("Monthly Cashflow After Taxes", PAGE_MARGIN + 4, y + 7)

  // Value
  doc.setFontSize(16)
  doc.setTextColor(color[0], color[1], color[2])
  doc.setFont("helvetica", "bold")
  doc.text(
    `${eur(results.monthlyCashflowAfterTax)} / mo`,
    PAGE_MARGIN + 4,
    y + 14.5,
  )

  // Yield on the right side
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Gross Yield: ${pctFromDecimal(results.grossRentalYield)}`,
    PAGE_MARGIN + CONTENT_WIDTH - 4,
    y + 7,
    { align: "right" },
  )
  doc.text(
    `Factor: ${factor(results.factorColdRentVsPrice)}`,
    PAGE_MARGIN + CONTENT_WIDTH - 4,
    y + 14.5,
    { align: "right" },
  )

  return y + boxHeight + 8
}

/** Add a section title. */
function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text(title, PAGE_MARGIN, y)
  return y + 2
}

/** Add a two-column table using autoTable. */
function addTable(
  doc: jsPDF,
  rows: [string, string][],
  startY: number,
): number {
  autoTable(doc, {
    startY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    tableWidth: CONTENT_WIDTH,
    head: [],
    body: rows,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: [...TEXT_DARK] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: CONTENT_WIDTH * 0.55, fontStyle: "normal" },
      1: {
        cellWidth: CONTENT_WIDTH * 0.45,
        halign: "right",
        fontStyle: "bold",
      },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
  })

  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY
}

/** Add footer to every page. */
function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()

    // Disclaimer
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(
      "This report is for informational purposes only and does not constitute financial or legal advice.",
      PAGE_MARGIN,
      pageHeight - 14,
    )

    // Branding + page number
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("HeimPath", PAGE_MARGIN, pageHeight - 8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_MARGIN + CONTENT_WIDTH,
      pageHeight - 8,
      { align: "right" },
    )
  }
}

/** Check if we need a new page and add one if so. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - 25) {
    doc.addPage()
    return PAGE_MARGIN
  }
  return y
}

/** Add the Property Overview section (shared by both variants). */
function addPropertyOverview(
  doc: jsPDF,
  sectionNum: number,
  state: PropertyEvaluationState,
  results: EvaluationResults,
  startY: number,
): number {
  let y = ensureSpace(doc, startY, 50)
  y = addSectionTitle(doc, `${sectionNum}. Property Overview`, y)
  y = addTable(
    doc,
    [
      ["Purchase Price", eur(state.propertyInfo.purchasePrice)],
      ["Living Space", `${state.propertyInfo.squareMeters} m²`],
      ["Price per m²", eur2(results.pricePerM2)],
      ["Broker Fee", pct(state.propertyInfo.brokerFeePercent)],
      ["Notary Fee", pct(state.propertyInfo.notaryFeePercent)],
      ["Land Registry Fee", pct(state.propertyInfo.landRegistryFeePercent)],
      ["Transfer Tax", pct(state.propertyInfo.transferTaxPercent)],
      [
        "Total Closing Costs",
        `${eur(results.totalClosingCosts)} (${pctFromDecimal(results.totalClosingCostsPct)})`,
      ],
      ["Total Investment", eur(results.totalInvestment)],
    ],
    y,
  )
  return y + 6
}

/** Add the Financing section (shared by both variants). */
function addFinancingSection(
  doc: jsPDF,
  sectionNum: number,
  state: PropertyEvaluationState,
  results: EvaluationResults,
  startY: number,
): number {
  let y = ensureSpace(doc, startY, 50)
  y = addSectionTitle(doc, `${sectionNum}. Financing`, y)
  y = addTable(
    doc,
    [
      ["Loan Percentage", pct(state.financing.loanPercent)],
      ["Loan Amount", eur(results.loanAmount)],
      ["Equity Required", eur(results.equity)],
      ["Interest Rate", pct(state.financing.interestRatePercent)],
      ["Repayment Rate", pct(state.financing.repaymentRatePercent)],
      ["Monthly Interest (Yr 1)", eur(results.monthlyInterestYr1)],
      ["Monthly Repayment (Yr 1)", eur(results.monthlyRepaymentYr1)],
      ["Total Debt Service", `${eur(results.monthlyDebtService)} / mo`],
    ],
    y,
  )
  return y + 6
}

/** Add the owner-occupier cost highlight box. */
function addOwnerCostHighlight(
  doc: jsPDF,
  results: EvaluationResults,
  y: number,
): number {
  const boxHeight = 18
  const monthlyCost = results.totalHausgeldMonthly + results.monthlyDebtService

  // Blue border box
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.6)
  doc.setFillColor(255, 255, 255)
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, "S")

  // Label
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text("Monthly Cost of Ownership", PAGE_MARGIN + 4, y + 7)

  // Value
  doc.setFontSize(16)
  doc.setTextColor(...BRAND_BLUE)
  doc.setFont("helvetica", "bold")
  doc.text(`${eur(monthlyCost)} / mo`, PAGE_MARGIN + 4, y + 14.5)

  return y + boxHeight + 8
}

/******************************************************************************
                              Export
******************************************************************************/

/** Generate and download a branded PDF evaluation report. */
export function generateEvaluationPdf(
  state: PropertyEvaluationState,
  results: EvaluationResults,
  isOwnerOccupier?: boolean,
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Header
  let y = addHeader(doc, state.propertyInfo.address, date)

  if (isOwnerOccupier) {
    // Owner-occupier variant: cost of ownership focus
    y = addOwnerCostHighlight(doc, results, y)
    y = addPropertyOverview(doc, 1, state, results, y)

    // 2. Operating Costs
    y = ensureSpace(doc, y, 40)
    y = addSectionTitle(doc, "2. Operating Costs", y)
    y = addTable(
      doc,
      [
        ["Total Hausgeld", `${eur(results.totalHausgeldMonthly)} / mo`],
        [
          "Allocable Costs",
          `${eur(results.allocableCostsMonthly)} / mo`,
        ],
        [
          "Property Tax (Grundsteuer)",
          `${eur(state.operatingCosts.propertyTaxMonthly)} / mo`,
        ],
        [
          "Non-Allocable Costs",
          `${eur(results.nonAllocableCostsMonthly)} / mo`,
        ],
      ],
      y,
    )
    y += 6

    y = addFinancingSection(doc, 3, state, results, y)

    // 4. Monthly Cost Breakdown
    const monthlyCost =
      results.totalHausgeldMonthly + results.monthlyDebtService
    y = ensureSpace(doc, y, 40)
    y = addSectionTitle(doc, "4. Monthly Cost Breakdown", y)
    addTable(
      doc,
      [
        ["Management Costs (Hausgeld)", eur(results.totalHausgeldMonthly)],
        ["Interest", eur(results.monthlyInterestYr1)],
        ["Repayment / Acquittance", eur(results.monthlyRepaymentYr1)],
        ["Total Monthly Cost", eur(monthlyCost)],
      ],
      y,
    )
  } else {
    // Investment variant: full cashflow analysis
    y = addCashflowHighlight(doc, results, y)
    y = addPropertyOverview(doc, 1, state, results, y)

    // 2. Rent & Yield
    y = ensureSpace(doc, y, 50)
    y = addSectionTitle(doc, "2. Rent & Yield", y)
    y = addTable(
      doc,
      [
        ["Rent per m²", eur2(state.rent.rentPerSqm)],
        ["Parking Rent", eur(state.rent.parkingRent)],
        ["Cold Rent (monthly)", eur(results.totalColdRentMonthly)],
        ["Warm Rent (monthly)", eur(results.warmRentMonthly)],
        ["Net Cold Rent (yearly)", eur(results.netColdRentAnnual)],
        [
          "Gross Rental Yield",
          pctFromDecimal(results.grossRentalYield),
        ],
        [
          "Cold Rent Factor (Kaufpreisfaktor)",
          factor(results.factorColdRentVsPrice),
        ],
      ],
      y,
    )
    y += 6

    // 3. Operating Costs
    y = ensureSpace(doc, y, 40)
    y = addSectionTitle(doc, "3. Operating Costs", y)
    y = addTable(
      doc,
      [
        [
          "Allocable Costs",
          `${eur(results.allocableCostsMonthly)} / mo`,
        ],
        [
          "Non-Allocable Costs",
          `${eur(results.nonAllocableCostsMonthly)} / mo`,
        ],
        ["Total Hausgeld", `${eur(results.totalHausgeldMonthly)} / mo`],
      ],
      y,
    )
    y += 6

    y = addFinancingSection(doc, 4, state, results, y)

    // 5. Monthly Cashflow
    y = ensureSpace(doc, y, 50)
    y = addSectionTitle(doc, "5. Monthly Cashflow", y)
    y = addTable(
      doc,
      [
        ["Warm Rent", eur(results.warmRentMonthly)],
        ["- Management Costs", eur(results.totalHausgeldMonthly)],
        ["- Debt Service", eur(results.monthlyDebtService)],
        ["= Cashflow Before Tax", eur(results.monthlyCashflowPretax)],
        [
          results.monthlyTaxBenefit >= 0
            ? "+ Tax Benefit"
            : "- Tax",
          eur2(results.monthlyTaxBenefit),
        ],
        [
          "= Cashflow After Tax",
          eur(results.monthlyCashflowAfterTax),
        ],
      ],
      y,
    )
    y += 6

    // 6. Tax Calculation
    y = ensureSpace(doc, y, 50)
    y = addSectionTitle(doc, "6. Tax Calculation", y)
    y = addTable(
      doc,
      [
        ["AfA Depreciation Rate", pct(state.rent.depreciationRatePercent)],
        ["Building Share", pct(state.rent.buildingSharePercent)],
        ["AfA Basis", eur(results.afaBasis)],
        ["Annual AfA", eur(results.annualAfa)],
        ["Monthly AfA (display)", eur2(results.monthlyAfaDisplay)],
        [
          "Marginal Tax Rate",
          pctFromDecimal(results.personalMarginalTaxRate),
        ],
        [
          "Taxable Property Income (monthly)",
          eur2(results.monthlyTaxablePropertyIncome),
        ],
        [
          results.monthlyTaxBenefit >= 0
            ? "Tax Benefit (monthly)"
            : "Tax (monthly)",
          eur2(results.monthlyTaxBenefit),
        ],
      ],
      y,
    )
    y += 6

    // 7. KPI Summary
    if (results.annualRows.length > 0) {
      y = ensureSpace(doc, y, 40)
      y = addSectionTitle(
        doc,
        `7. ${results.annualRows.length}-Year KPI Summary`,
        y,
      )
      y = addTable(
        doc,
        [
          ["Total Net CF After Tax", eur(results.totalNetCfAfterTax)],
          ["Total Equity Invested", eur(results.totalEquityInvested)],
          ["Final Equity KPI", eur(results.finalEquityKpi)],
        ],
        y,
      )
      y += 6

      // 8. Annual Cashflow Projection
      y = ensureSpace(doc, y, 30)
      y = addSectionTitle(doc, "8. Annual Cashflow Projection", y)

      autoTable(doc, {
        startY: y,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        tableWidth: CONTENT_WIDTH,
        head: [
          [
            "Year",
            "Cold Rent",
            "Interest",
            "Repayment",
            "Net CF Post-Tax",
            "Prop. Value",
            "Eq. Buildup",
          ],
        ],
        body: results.annualRows.map((row) => [
          String(row.year),
          eur(row.coldRent),
          eur(row.interest),
          eur(row.repayment),
          eur(row.netCfAfterTax),
          eur(row.propertyValue),
          eur(row.equityBuildupAccumulated),
        ]),
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
          textColor: [...TEXT_DARK] as [number, number, number],
        },
        headStyles: {
          fillColor: [...BRAND_BLUE] as [number, number, number],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      })
    }
  }

  // Footer on all pages
  addFooter(doc)

  // Generate filename
  const cleaned = state.propertyInfo.address
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
  const slug = cleaned || `${Date.now()}`
  const filename = `heimpath-evaluation-${slug}.pdf`

  doc.save(filename)
}
