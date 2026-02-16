/**
 * Document Upload Form
 * Drag-and-drop PDF upload zone with validation
 */

import { useNavigate } from "@tanstack/react-router"
import { AlertCircle, FileText, Upload } from "lucide-react"
import { useCallback, useState } from "react"

import { cn } from "@/common/utils"
import { useUploadDocument } from "@/hooks/mutations"

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_FILE_SIZE_MB = 20
const ACCEPTED_TYPE = "application/pdf"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. PDF upload form with drag-and-drop. */
function DocumentUploadForm(props: IProps) {
  const { className } = props
  const navigate = useNavigate()
  const uploadMutation = useUploadDocument()

  const [isDragging, setIsDragging] = useState(false)
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
      uploadMutation.mutate(file, {
        onSuccess: (data) => {
          navigate({
            to: "/documents/$documentId",
            params: { documentId: data.id },
          })
        },
      })
    },
    [validateFile, uploadMutation, navigate],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleUpload(file)
    },
    [handleUpload],
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
      if (file) handleUpload(file)
    },
    [handleUpload],
  )

  return (
    <div className={className}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone for file uploads */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploadMutation.isPending && "pointer-events-none opacity-60",
        )}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploadMutation.isPending}
        />

        <div className="flex flex-col items-center gap-3">
          {uploadMutation.isPending ? (
            <>
              <FileText className="h-10 w-10 text-blue-500 animate-pulse" />
              <p className="text-sm font-medium">Uploading document...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Drop a PDF here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  German real estate documents up to {MAX_FILE_SIZE_MB} MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {validationError}
        </div>
      )}

      {uploadMutation.isError && (
        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(uploadMutation.error as Error)?.message ||
            "Upload failed. Please try again."}
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DocumentUploadForm }
