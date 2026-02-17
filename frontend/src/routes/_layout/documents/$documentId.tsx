/**
 * Document Detail Page
 * Shows processing status, translation, clauses, and risk warnings
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, FileText } from "lucide-react"
import { useState } from "react"
import {
  ClauseHighlights,
  ProcessingStatus,
  RiskWarnings,
  TranslationViewer,
} from "@/components/Documents"
import { DOCUMENT_TYPE_LABELS } from "@/components/Documents/DocumentCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDocument } from "@/hooks/queries"
import type { DocumentType } from "@/models/document"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/documents/$documentId")({
  component: DocumentDetailPage,
  head: () => ({
    meta: [{ title: "Document Details - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Document detail page. */
function DocumentDetailPage() {
  const { documentId } = Route.useParams()
  const { data: doc, isLoading, error } = useDocument(documentId)
  const [activeTab, setActiveTab] = useState("translation")

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load document
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The document could not be found or there was an error loading it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !doc) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-16 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const isCompleted = doc.status === "completed"
  const translation = doc.translation

  return (
    <div className="space-y-6">
      {/* Back link and header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <h1 className="text-xl font-bold truncate">
              {doc.originalFilename}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType] ||
                doc.documentType}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
            </span>
          </div>
        </div>
      </div>

      {/* Processing status */}
      <ProcessingStatus
        documentId={doc.id}
        status={doc.status}
        pageCount={doc.pageCount}
        errorMessage={doc.errorMessage}
      />

      {/* Translation content (only when completed) */}
      {isCompleted && translation && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="translation">Translation</TabsTrigger>
            <TabsTrigger value="clauses">
              Clauses ({translation.clausesDetected.length})
            </TabsTrigger>
            <TabsTrigger value="warnings">
              Warnings ({translation.riskWarnings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translation" className="mt-4">
            <TranslationViewer pages={translation.translatedPages} />
          </TabsContent>

          <TabsContent value="clauses" className="mt-4">
            <ClauseHighlights clauses={translation.clausesDetected} />
          </TabsContent>

          <TabsContent value="warnings" className="mt-4">
            <RiskWarnings warnings={translation.riskWarnings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default DocumentDetailPage
