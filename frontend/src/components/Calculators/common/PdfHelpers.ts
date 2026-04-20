/**
 * Shared PDF generation helpers for calculator reports.
 * Used by GenerateEvaluationPdf and GenerateHiddenCostsPdf.
 */

import type jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/******************************************************************************
                              Constants
******************************************************************************/

export const BRAND_BLUE = [30, 64, 175] as const // #1e40af
export const TEXT_DARK = [17, 24, 39] as const // #111827
export const TEXT_MUTED = [107, 114, 128] as const // #6b7280
export const PAGE_MARGIN = 20
export const CONTENT_WIDTH = 170 // A4 width (210) minus 2 * margin

/******************************************************************************
                              Functions
******************************************************************************/

/** Add branded header to the PDF. */
export function addHeader(
  doc: jsPDF,
  subtitle: string,
  date: string,
  address?: string,
): number {
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
  doc.text(subtitle, PAGE_MARGIN + 16, y + 11)

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

/** Add a section title. */
export function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text(title, PAGE_MARGIN, y)
  return y + 2
}

/** Add a two-column table using autoTable. */
export function addTable(
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
export function addFooter(doc: jsPDF): void {
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
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - 25) {
    doc.addPage()
    return PAGE_MARGIN
  }
  return y
}
