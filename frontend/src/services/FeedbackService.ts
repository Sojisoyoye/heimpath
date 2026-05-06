/**
 * Feedback Service
 * Handles API calls for user feedback submissions
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import { PATHS } from "./common/Paths"
import { transformKeysToSnake } from "./common/transformKeys"

/******************************************************************************
                              Types
******************************************************************************/

interface FeedbackInput {
  category: string
  message: string
  pageUrl?: string
}

/******************************************************************************
                              Service
******************************************************************************/

class FeedbackServiceClass {
  async submit(data: FeedbackInput): Promise<void> {
    await request(OpenAPI, {
      method: "POST",
      url: PATHS.FEEDBACK.SUBMIT,
      body: transformKeysToSnake(data),
    })
  }
}

const FeedbackService = new FeedbackServiceClass()

/******************************************************************************
                              Export
******************************************************************************/

export { FeedbackService }
export type { FeedbackInput }
