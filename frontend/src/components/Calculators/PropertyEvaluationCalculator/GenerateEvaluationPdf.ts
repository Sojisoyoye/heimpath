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
  const color: [number, number, number] = results.isPositiveCashflow
    ? [...GREEN]
    : [...RED]

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
  doc.text(`${eur(results.cashflowAfterTax)} / mo`, PAGE_MARGIN + 4, y + 14.5)

  // Yield on the right side
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Gross Yield: ${pct(results.grossRentalYield)}`,
    PAGE_MARGIN + CONTENT_WIDTH - 4,
    y + 7,
    { align: "right" },
  )
  doc.text(
    `Net Yield: ${pct(results.netRentalYield)}`,
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

/******************************************************************************
                              Export
******************************************************************************/

/** Generate and download a branded PDF evaluation report. */
export function generateEvaluationPdf(
  state: PropertyEvaluationState,
  results: EvaluationResults,
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Header
  let y = addHeader(doc, state.propertyInfo.address, date)

  // Cashflow highlight
  y = addCashflowHighlight(doc, results, y)

  // 1. Property Overview
  y = ensureSpace(doc, y, 50)
  y = addSectionTitle(doc, "1. Property Overview", y)
  y = addTable(
    doc,
    [
      ["Purchase Price", eur(state.propertyInfo.purchasePrice)],
      ["Living Space", `${state.propertyInfo.squareMeters} m²`],
      ["Price per m²", eur2(results.pricePerSqm)],
      ["Broker Fee", pct(state.propertyInfo.brokerFeePercent)],
      ["Notary Fee", pct(state.propertyInfo.notaryFeePercent)],
      ["Land Registry Fee", pct(state.propertyInfo.landRegistryFeePercent)],
      ["Transfer Tax", pct(state.propertyInfo.transferTaxPercent)],
      [
        "Total Incidental Costs",
        `${eur(results.totalIncidentalCosts)} (${pct(results.totalIncidentalCostsPercent)})`,
      ],
      ["Total Investment", eur(results.totalInvestment)],
    ],
    y,
  )
  y += 6

  // 2. Rent & Yield
  y = ensureSpace(doc, y, 50)
  y = addSectionTitle(doc, "2. Rent & Yield", y)
  y = addTable(
    doc,
    [
      ["Rent per m²", eur2(state.rent.rentPerSqm)],
      ["Parking Rent", eur(state.rent.parkingRent)],
      ["Cold Rent (monthly)", eur(results.coldRentMonthly)],
      ["Warm Rent (monthly)", eur(results.warmRentMonthly)],
      ["Net Cold Rent (yearly)", eur(results.netColdRentYearly)],
      ["Gross Rental Yield", pct(results.grossRentalYield)],
      ["Net Rental Yield", pct(results.netRentalYield)],
      ["Cold Rent Factor (Kaufpreisfaktor)", factor(results.coldRentFactor)],
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
        "Allocable Hausgeld",
        `${eur(state.operatingCosts.hausgeldAllocable)} / mo`,
      ],
      [
        "Property Tax (Grundsteuer)",
        `${eur(state.operatingCosts.propertyTaxMonthly)} / mo`,
      ],
      ["Total Allocable Costs", `${eur(results.totalAllocableCosts)} / mo`],
      [
        "Non-Allocable Hausgeld",
        `${eur(state.operatingCosts.hausgeldNonAllocable)} / mo`,
      ],
      [
        "Reserves (Instandhaltungsrücklage)",
        `${eur(state.operatingCosts.reservesPortion)} / mo`,
      ],
      [
        "Total Non-Allocable Costs",
        `${eur(results.totalNonAllocableCosts)} / mo`,
      ],
      ["Total Hausgeld", `${eur(results.totalHausgeld)} / mo`],
    ],
    y,
  )
  y += 6

  // 4. Financing
  y = ensureSpace(doc, y, 50)
  y = addSectionTitle(doc, "4. Financing", y)
  y = addTable(
    doc,
    [
      ["Loan Percentage", pct(state.financing.loanPercent)],
      [
        "110% Financing",
        state.financing.includeAcquisitionCosts ? "Yes" : "No",
      ],
      ["Loan Amount", eur(results.loanAmount)],
      ["Equity Required", eur(results.equityAmount)],
      ["Interest Rate", pct(state.financing.interestRatePercent)],
      ["Repayment Rate", pct(state.financing.repaymentRatePercent)],
      ["Monthly Interest", eur(results.monthlyInterest)],
      ["Monthly Repayment", eur(results.monthlyRepayment)],
      ["Total Debt Service", `${eur(results.debtServiceMonthly)} / mo`],
    ],
    y,
  )
  y += 6

  // 5. Monthly Cashflow
  y = ensureSpace(doc, y, 50)
  y = addSectionTitle(doc, "5. Monthly Cashflow", y)
  y = addTable(
    doc,
    [
      ["Warm Rent", eur(results.warmRentMonthly)],
      ["– Non-Allocable Costs", eur(results.totalNonAllocableCosts)],
      ["– Debt Service", eur(results.debtServiceMonthly)],
      ["= Cashflow Before Tax", eur(results.cashflowBeforeTax)],
      ["– Tax / + Tax Benefit", eur(results.taxMonthly)],
      ["= Cashflow After Tax", eur(results.cashflowAfterTax)],
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
      ["Depreciation (yearly)", eur(results.depreciationYearly)],
      ["Depreciation (monthly)", eur2(results.depreciationMonthly)],
      ["Interest Expense (yearly)", eur(results.interestYearly)],
      ["Marginal Tax Rate", pct(state.rent.marginalTaxRatePercent)],
      ["Taxable Income (monthly)", eur2(results.taxableCashflowMonthly)],
      ["Tax / Benefit (yearly)", eur(results.taxYearly)],
      ["Tax / Benefit (monthly)", eur2(results.taxMonthly)],
    ],
    y,
  )
  y += 6

  // 7. Return on Equity
  y = ensureSpace(doc, y, 30)
  y = addSectionTitle(doc, "7. Return on Equity", y)
  addTable(
    doc,
    [
      ["Return on Equity (with appreciation)", pct(results.returnOnEquity)],
      [
        "Return on Equity (without appreciation)",
        pct(results.returnOnEquityWithoutAppreciation),
      ],
      [
        "Value Increase Assumption",
        `${pct(state.rent.valueIncreasePercent)} p.a.`,
      ],
      [
        "Equity Interest Opportunity Cost",
        `${pct(state.rent.equityInterestPercent)} p.a.`,
      ],
    ],
    y,
  )

  // Footer on all pages
  addFooter(doc)

  // Generate filename
  const slug = state.propertyInfo.address
    ? state.propertyInfo.address
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40)
    : `${Date.now()}`
  const filename = `heimpath-evaluation-${slug}.pdf`

  doc.save(filename)
}
