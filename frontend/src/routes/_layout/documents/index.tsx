/**
 * Documents List Page
 * Upload and browse translated documents
 */

import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import { DocumentList, DocumentUploadForm } from "@/components/Documents"

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
                              Components
******************************************************************************/

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
