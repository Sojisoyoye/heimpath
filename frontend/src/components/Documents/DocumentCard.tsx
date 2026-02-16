/**
 * Document Card Component
 * Displays a document summary in a card format
 */

import { Link } from "@tanstack/react-router"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
} from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DocumentStatus,
  DocumentSummary,
  DocumentType,
} from "@/models/document"

interface IProps {
  document: DocumentSummary
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  kaufvertrag: "Purchase Agreement",
  mietvertrag: "Rental Agreement",
  expose: "Property Listing",
  nebenkostenabrechnung: "Utility Bill",
  grundbuchauszug: "Land Register",
  teilungserklaerung: "Division Declaration",
  hausgeldabrechnung: "Condo Fee Statement",
  unknown: "Unknown",
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  uploaded: {
    label: "Uploaded",
    icon: Clock,
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

/** Format file size for display. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Document summary card. */
function DocumentCard(props: IProps) {
  const { document: doc, className } = props

  const statusConfig = STATUS_CONFIG[doc.status]
  const StatusIcon = statusConfig.icon

  return (
    <Link
      to="/documents/$documentId"
      params={{ documentId: doc.id }}
      className="block"
    >
      <Card
        className={cn("transition-shadow hover:shadow-md group", className)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-semibold group-hover:text-blue-600 transition-colors truncate">
                {doc.originalFilename}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn("text-xs gap-1 shrink-0", statusConfig.className)}
            >
              <StatusIcon
                className={cn(
                  "h-3 w-3",
                  doc.status === "processing" && "animate-spin",
                )}
              />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {DOCUMENT_TYPE_LABELS[doc.documentType]}
            </Badge>
            <span>
              {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
            </span>
            <span>{formatFileSize(doc.fileSizeBytes)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(doc.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DocumentCard, DOCUMENT_TYPE_LABELS, STATUS_CONFIG }
