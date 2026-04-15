/**
 * Document List Component
 * Grid of DocumentCards with filtering and pagination
 */

import { FileText, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeleteDocument, useShareDocument } from "@/hooks/mutations"
import { useDocuments } from "@/hooks/queries"
import useCustomToast from "@/hooks/useCustomToast"
import { DocumentCard } from "./DocumentCard"

interface IProps {
  pageSize?: number
}

/******************************************************************************
                              Constants
******************************************************************************/

const DOCUMENT_TYPE_OPTIONS = [
  { value: "kaufvertrag", label: "Purchase Agreement" },
  { value: "mietvertrag", label: "Rental Agreement" },
  { value: "expose", label: "Property Listing" },
  { value: "nebenkostenabrechnung", label: "Utility Bill" },
  { value: "grundbuchauszug", label: "Land Register" },
  { value: "teilungserklaerung", label: "Division Declaration" },
  { value: "hausgeldabrechnung", label: "Condo Fee Statement" },
  { value: "unknown", label: "Unknown" },
]

const STATUS_OPTIONS = [
  { value: "uploaded", label: "Uploaded" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
]

const ALL_TYPES = "all_types"
const ALL_STATUSES = "all_statuses"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Paginated grid of document cards with filters. */
function DocumentList(props: IProps) {
  const { pageSize = 12 } = props
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const deleteMutation = useDeleteDocument()
  const shareMutation = useShareDocument()

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      documentType: documentType || undefined,
      status: statusFilter || undefined,
    }),
    [debouncedSearch, documentType, statusFilter],
  )

  const { data, isLoading, error, refetch } = useDocuments(
    page,
    pageSize,
    filters,
  )

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Functions

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const handleTypeChange = useCallback((value: string) => {
    setDocumentType(value === ALL_TYPES ? "" : value)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value === ALL_STATUSES ? "" : value)
    setPage(1)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Are you sure you want to delete this document?")) {
        return
      }
      deleteMutation.mutate(id, {
        onSuccess: () => showSuccessToast("Document deleted"),
        onError: () => showErrorToast("Failed to delete document"),
      })
    },
    [deleteMutation, showSuccessToast, showErrorToast],
  )

  const handleShare = useCallback(
    (id: string) => {
      shareMutation.mutate(id, {
        onSuccess: (data) => {
          const url = `${window.location.origin}/documents/shared/${data.shareId}`
          navigator.clipboard.writeText(url)
          showSuccessToast("Share link copied to clipboard")
        },
        onError: () => showErrorToast("Failed to generate share link"),
      })
    },
    [shareMutation, showSuccessToast, showErrorToast],
  )

  // Render

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-2">
        <p className="text-sm text-destructive">Failed to load documents</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={documentType || ALL_TYPES}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All types</SelectItem>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || ALL_STATUSES}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-lg border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {debouncedSearch || documentType || statusFilter
              ? "No documents found"
              : "No documents yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {debouncedSearch || documentType || statusFilter
              ? "Try adjusting your filters"
              : "Upload your first document to get started"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                onShare={handleShare}
              />
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
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DocumentList }
