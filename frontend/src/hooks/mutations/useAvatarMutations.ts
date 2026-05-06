/**
 * Avatar mutation hooks
 * React Query hooks for avatar upload and removal
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import useCustomToast from "@/hooks/useCustomToast"
import { UserService } from "@/services/UserService"

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (file: File) => UserService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      showSuccessToast("Avatar updated successfully.")
    },
    onError: () => {
      showErrorToast("Failed to upload avatar. Please try again.")
    },
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: () => UserService.removeAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      showSuccessToast("Avatar removed.")
    },
    onError: () => {
      showErrorToast("Failed to remove avatar. Please try again.")
    },
  })
}
