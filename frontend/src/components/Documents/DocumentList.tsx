/**
 * Document List Component
 * Grid of DocumentCards with pagination
 */

import { FileText } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useDocuments } from "@/hooks/queries"
import { DocumentCard } from "./DocumentCard"

interface IProps {
  pageSize?: number
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Paginated grid of document cards. */
function DocumentList(props: IProps) {
  const { pageSize = 12 } = props
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useDocuments(page, pageSize)

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">Failed to load documents</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-lg border bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!data?.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No documents yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a German real estate PDF to get started
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(data.total / pageSize)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.data.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DocumentList }
