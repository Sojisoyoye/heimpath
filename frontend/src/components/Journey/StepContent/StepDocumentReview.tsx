/**
 * Step Document Review Component
 * Inline document upload and summary for journey review steps
 */

import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { useUploadDocument } from "@/hooks/mutations"
import { useDocumentStatus, useStepDocuments } from "@/hooks/queries"
import type { DocumentSummary } from "@/models/document"
import { queryKeys } from "@/query/queryKeys"

interface IProps {
  stepId: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_FILE_SIZE_MB = 20
const ACCEPTED_TYPE = "application/pdf"

const STATUS_BADGE_STYLES: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single document card with status and warnings. */
function DocumentCard(props: { doc: DocumentSummary; stepId: string }) {
  const { doc, stepId } = props
  const queryClient = useQueryClient()
  const isProcessing = doc.status === "uploaded" || doc.status === "processing"
  const hasInvalidated = useRef(false)

  const { data: statusData } = useDocumentStatus(doc.id, isProcessing)
  const currentStatus = statusData?.status ?? doc.status
  const errorMessage = statusData?.errorMessage ?? null

  // Refresh the parent step documents query when processing finishes
  useEffect(() => {
    if (hasInvalidated.current) return
    if (currentStatus === "completed" || currentStatus === "failed") {
      hasInvalidated.current = true
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byStep(stepId),
      })
    }
  }, [currentStatus, stepId, queryClient])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {doc.originalFilename}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_BADGE_STYLES[currentStatus])}
              >
                {currentStatus === "processing" && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {currentStatus}
              </Badge>
              <span>{doc.pageCount} pages</span>
            </div>
          </div>
        </div>

        {currentStatus === "completed" && (
          <Link
            to="/documents/$documentId"
            params={{ documentId: doc.id }}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            View Translation
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {currentStatus === "failed" && errorMessage && (
        <div className="flex items-center gap-2 px-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  )
}

/** Compact upload zone for the step. */
function StepUploadZone(props: {
  isPending: boolean
  onUpload: (file: File) => void
  validationError: string | null
  uploadError: string | null
}) {
  const { isPending, onUpload, validationError, uploadError } = props
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onUpload(file)
    },
    [onUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onUpload(file)
    },
    [onUpload],
  )

  return (
    <div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone for file uploads */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={isPending}
        />

        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
            <span className="text-sm">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Upload a German PDF for translation
              </p>
              <p className="text-xs text-muted-foreground">
                PDF up to {MAX_FILE_SIZE_MB} MB
              </p>
            </div>
          </>
        )}
      </div>

      {validationError && (
        <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {validationError}
        </div>
      )}

      {uploadError && (
        <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  )
}

/** Default component. Upload zone + document list for a journey step. */
function StepDocumentReview(props: IProps) {
  const { stepId } = props
  const { data: documents = [] } = useStepDocuments(stepId)
  const uploadMutation = useUploadDocument()
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== ACCEPTED_TYPE) {
      return "Only PDF files are accepted"
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File exceeds maximum size of ${MAX_FILE_SIZE_MB} MB`
    }
    return null
  }, [])

  const handleUpload = useCallback(
    (file: File) => {
      const error = validateFile(file)
      if (error) {
        setValidationError(error)
        return
      }
      setValidationError(null)
      uploadMutation.mutate({ file, journeyStepId: stepId })
    },
    [validateFile, uploadMutation, stepId],
  )

  return (
    <div className="space-y-3">
      <StepUploadZone
        isPending={uploadMutation.isPending}
        onUpload={handleUpload}
        validationError={validationError}
        uploadError={
          uploadMutation.isError
            ? ((uploadMutation.error as Error)?.message ??
              "Upload failed. Please try again.")
            : null
        }
      />

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} stepId={stepId} />
          ))}
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepDocumentReview }
