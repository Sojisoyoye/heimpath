/**
 * Documents List Page
 * Upload and browse translated documents
 */

import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import { DocumentList, DocumentUploadForm } from "@/components/Documents"
import { Card, CardContent } from "@/components/ui/card"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/documents/")({
  component: DocumentsPage,
  head: () => ({
    meta: [{ title: "Documents - HeimPath" }],
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

const DOCUMENT_TYPE_META = [
  {
    title: "Purchase Contract (Kaufvertrag)",
    description:
      "Full translation + clause-by-clause analysis. We flag unusual terms, seller obligations, and financial risks.",
  },
  {
    title: "Land Registry Extract (Grundbuch)",
    description:
      "Translation of ownership record, liens, easements, and encumbrances — critical before any purchase.",
  },
  {
    title: "Condominium Declaration (Teilungserklärung)",
    description:
      "Explains your ownership share, shared costs, and usage rights in a multi-unit building.",
  },
  {
    title: "Rental Agreement (Mietvertrag)",
    description:
      "Full translation highlighting rent terms, notice periods, deposit rules, and tenant obligations.",
  },
  {
    title: "Owners' Meeting Minutes (WEG-Protokoll)",
    description:
      "Summary of decisions affecting shared costs, planned works, and community rules.",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Responsive grid showing what document types HeimPath can analyse. */
function SupportedDocumentTypes() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        What you can upload
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DOCUMENT_TYPE_META.map((type) => (
          <Card key={type.title} className="bg-muted/40">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium leading-snug">{type.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {type.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Default component. Documents listing page with upload. */
function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Document Translation
        </h1>
        <p className="text-muted-foreground">
          Upload German real estate PDFs for translation and analysis
        </p>
      </div>

      {/* Upload zone */}
      <DocumentUploadForm />

      {/* Supported document types */}
      <SupportedDocumentTypes />

      {/* Document list */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
        <DocumentList pageSize={12} />
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default DocumentsPage
