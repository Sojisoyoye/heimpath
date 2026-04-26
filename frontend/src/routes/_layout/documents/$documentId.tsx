/**
 * Document Detail Page
 * Shows processing status, translation, clauses, and risk warnings
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, FileText, Share2, Trash2 } from "lucide-react"
import { useCallback, useState } from "react"
import {
  ClauseAnalysis,
  ClauseHighlights,
  ProcessingStatus,
  RiskWarnings,
  TranslationViewer,
  TypeAnalysis,
} from "@/components/Documents"
import { DOCUMENT_TYPE_LABELS } from "@/components/Documents/DocumentCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeleteDocument, useShareDocument } from "@/hooks/mutations"
import { useDocument } from "@/hooks/queries"
import useCustomToast from "@/hooks/useCustomToast"
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
  const navigate = useNavigate()
  const { data: doc, isLoading, error } = useDocument(documentId)
  const [activeTab, setActiveTab] = useState("translation")

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const deleteMutation = useDeleteDocument()
  const shareMutation = useShareDocument()

  // Functions

  const handleDelete = useCallback(() => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return
    }
    deleteMutation.mutate(documentId, {
      onSuccess: () => {
        showSuccessToast("Document deleted")
        navigate({ to: "/documents" })
      },
      onError: () => showErrorToast("Failed to delete document"),
    })
  }, [documentId, deleteMutation, navigate, showSuccessToast, showErrorToast])

  const handleShare = useCallback(() => {
    shareMutation.mutate(documentId, {
      onSuccess: (data) => {
        const url = `${window.location.origin}/documents/shared/${data.shareId}`
        navigator.clipboard.writeText(url)
        showSuccessToast("Share link copied to clipboard")
      },
      onError: () => showErrorToast("Failed to generate share link"),
    })
  }, [documentId, shareMutation, showSuccessToast, showErrorToast])

  // Render

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
        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={shareMutation.isPending}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
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
            {(translation.kaufvertragAnalysis || translation.typeAnalysis) && (
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            )}
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

          {(translation.kaufvertragAnalysis || translation.typeAnalysis) && (
            <TabsContent value="analysis" className="mt-4">
              {translation.kaufvertragAnalysis ? (
                <ClauseAnalysis analysis={translation.kaufvertragAnalysis} />
              ) : (
                translation.typeAnalysis && (
                  <TypeAnalysis
                    documentType={doc.documentType}
                    typeAnalysis={translation.typeAnalysis}
                  />
                )
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default DocumentDetailPage
