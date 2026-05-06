/**
 * Avatar Upload Component
 * Interactive avatar with upload and remove functionality
 */

import { Camera, Loader2, Trash2 } from "lucide-react"
import { useRef } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRemoveAvatar, useUploadAvatar } from "@/hooks/mutations"
import useCustomToast from "@/hooks/useCustomToast"
import { getInitials } from "@/utils"

interface IProps {
  readonly avatarUrl?: string | null
  readonly fullName: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/******************************************************************************
                              Components
******************************************************************************/

function AvatarUpload(props: IProps) {
  const { avatarUrl, fullName } = props
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadAvatar()
  const removeMutation = useRemoveAvatar()
  const { showErrorToast } = useCustomToast()
  const isLoading = uploadMutation.isPending || removeMutation.isPending

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so re-selecting the same file triggers change
    e.target.value = ""

    if (!ACCEPTED_TYPES.has(file.type)) {
      showErrorToast("Invalid file type. Please use JPEG, PNG, or WebP.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      showErrorToast("File too large. Maximum size is 2 MB.")
      return
    }

    uploadMutation.mutate(file)
  }

  function handleUploadClick() {
    if (isLoading) return
    fileInputRef.current?.click()
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (isLoading) return
    removeMutation.mutate()
  }

  return (
    <div className="relative group">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Clickable avatar */}
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={isLoading}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Upload avatar"
      >
        <Avatar className="h-20 w-20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
          <AvatarFallback className="text-2xl font-semibold bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </button>

      {/* Remove button */}
      {avatarUrl && !isLoading && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -bottom-1 -right-1 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Remove avatar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AvatarUpload }
