/**
 * Processing Status Component
 * Shows processing progress with auto-polling
 */

import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useDocumentStatus } from "@/hooks/queries"
import type { DocumentStatus } from "@/models/document"
import { queryKeys } from "@/query/queryKeys"

interface IProps {
  documentId: string
  status: DocumentStatus
  pageCount: number
  errorMessage?: string | null
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Document processing status indicator. */
function ProcessingStatus(props: IProps) {
  const { documentId, status, pageCount, errorMessage } = props
  const queryClient = useQueryClient()

  const isProcessing = status === "uploaded" || status === "processing"

  const { data: statusData } = useDocumentStatus(documentId, isProcessing)

  const currentStatus = statusData?.status ?? status

  // Auto-refetch document detail when processing completes
  useEffect(() => {
    if (
      statusData &&
      (statusData.status === "completed" || statusData.status === "failed")
    ) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(documentId),
      })
    }
  }, [statusData, documentId, queryClient])

  if (currentStatus === "completed") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4">
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-400">
            Translation completed
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            {pageCount} {pageCount === 1 ? "page" : "pages"} translated
          </p>
        </div>
      </div>
    )
  }

  if (currentStatus === "failed") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800 dark:text-red-400">
            Processing failed
          </p>
          {errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-4">
      <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
          {currentStatus === "uploaded"
            ? "Queued for processing..."
            : "Translating document..."}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-500">
          Processing {pageCount} {pageCount === 1 ? "page" : "pages"}. This may
          take a moment.
        </p>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProcessingStatus }
