/**
 * PDF generation utility for Hidden Costs Calculator reports
 * Uses jsPDF + jspdf-autotable for branded report output
 */

import jsPDF from "jspdf"

import {
  addFooter,
  addHeader,
  addSectionTitle,
  addTable,
  BRAND_BLUE,
  CONTENT_WIDTH,
  PAGE_MARGIN,
  TEXT_MUTED,
} from "../common/PdfHelpers"

/******************************************************************************
                              Types
******************************************************************************/

interface CostBreakdown {
  propertyPrice: number
  transferTax: number
  notaryFee: number
  landRegistryFee: number
  agentCommission: number
  renovationEstimate: number
  movingCosts: number
  totalAdditionalCosts: number
  totalCostOfOwnership: number
  additionalCostPercentage: number
}

interface HiddenCostsInputs {
  state: string
  stateName: string
  propertyType: string
  propertyTypeLabel: string
  renovationLevel: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const RENOVATION_LABELS: Record<string, string> = {
  none: "None",
  light: "Light (3%)",
  medium: "Medium (8%)",
  full: "Full (15%)",
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Add the total cost highlight box. */
function addTotalCostHighlight(
  doc: jsPDF,
  costs: CostBreakdown,
  y: number,
): number {
  const boxHeight = 18

  // Blue border box
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.6)
  doc.setFillColor(255, 255, 255)
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, "S")

  // Label
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text("Total Cost of Ownership", PAGE_MARGIN + 4, y + 7)

  // Value
  doc.setFontSize(16)
  doc.setTextColor(...BRAND_BLUE)
  doc.setFont("helvetica", "bold")
  doc.text(EUR.format(costs.totalCostOfOwnership), PAGE_MARGIN + 4, y + 14.5)

  // Additional costs percentage on the right
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Additional Costs: ${costs.additionalCostPercentage.toFixed(1)}%`,
    PAGE_MARGIN + CONTENT_WIDTH - 4,
    y + 7,
    { align: "right" },
  )
  doc.text(
    EUR.format(costs.totalAdditionalCosts),
    PAGE_MARGIN + CONTENT_WIDTH - 4,
    y + 14.5,
    { align: "right" },
  )

  return y + boxHeight + 8
}

/******************************************************************************
                              Export
******************************************************************************/

/** Generate and download a branded PDF hidden costs report. */
export function generateHiddenCostsPdf(
  costs: CostBreakdown,
  inputs: Readonly<HiddenCostsInputs>,
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Header
  let y = addHeader(doc, "Hidden Costs Calculator Report", date)

  // Highlight box
  y = addTotalCostHighlight(doc, costs, y)

  // 1. Property Details
  y = addSectionTitle(doc, "1. Property Details", y)
  y = addTable(
    doc,
    [
      ["Purchase Price", EUR.format(costs.propertyPrice)],
      ["State (Bundesland)", inputs.stateName],
      ["Property Type", inputs.propertyTypeLabel],
      ["Renovation Level", RENOVATION_LABELS[inputs.renovationLevel] ?? "None"],
    ],
    y,
  )
  y += 6

  // 2. Cost Breakdown
  y = addSectionTitle(doc, "2. Cost Breakdown", y)

  const rows: [string, string][] = [
    [
      "Property Transfer Tax (Grunderwerbsteuer)",
      EUR.format(costs.transferTax),
    ],
    ["Notary Fees (Notarkosten)", EUR.format(costs.notaryFee)],
    [
      "Land Registry Fee (Grundbuchgebühren)",
      EUR.format(costs.landRegistryFee),
    ],
  ]
  if (costs.agentCommission > 0) {
    rows.push([
      "Agent Commission (Maklerprovision)",
      EUR.format(costs.agentCommission),
    ])
  }
  if (costs.renovationEstimate > 0) {
    rows.push(["Renovation Estimate", EUR.format(costs.renovationEstimate)])
  }
  if (costs.movingCosts > 0) {
    rows.push(["Moving Costs", EUR.format(costs.movingCosts)])
  }

  y = addTable(doc, rows, y)
  y += 6

  // 3. Summary
  y = addSectionTitle(doc, "3. Summary", y)
  y = addTable(
    doc,
    [
      ["Purchase Price", EUR.format(costs.propertyPrice)],
      ["Total Additional Costs", EUR.format(costs.totalAdditionalCosts)],
      [
        "Additional Cost Percentage",
        `${costs.additionalCostPercentage.toFixed(1)}%`,
      ],
      ["Total Cost of Ownership", EUR.format(costs.totalCostOfOwnership)],
    ],
    y,
  )

  // Footer
  addFooter(doc)

  // Download
  doc.save(`hidden-costs-report-${Date.now()}.pdf`)
}
