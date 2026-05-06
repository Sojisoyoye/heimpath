/**
 * Feedback mutation hooks
 */

import { useMutation } from "@tanstack/react-query"

import useCustomToast from "@/hooks/useCustomToast"
import type { FeedbackInput } from "@/services"
import { FeedbackService } from "@/services"
import { handleError } from "@/utils"

/******************************************************************************
                              Hooks
******************************************************************************/

/** Submit user feedback. */
function useSubmitFeedback(onSuccess?: () => void) {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (data: FeedbackInput) => FeedbackService.submit(data),
    onSuccess: () => {
      showSuccessToast("Thank you! Your feedback has been submitted.")
      onSuccess?.()
    },
    onError: handleError.bind(showErrorToast),
  })
}

/******************************************************************************
                              Export
******************************************************************************/

export { useSubmitFeedback }
