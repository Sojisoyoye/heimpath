import { AxiosError } from "axios"
import { ApiError } from "./client/core/ApiError"

function extractErrorMessage(err: Error): string {
  if (err instanceof AxiosError) {
    if (err.code === "ERR_NETWORK") {
      return "Unable to connect to the server. Please check your connection and try again."
    }
    return err.message
  }

  if (err instanceof ApiError) {
    const errDetail = (err.body as Record<string, unknown>)?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      return errDetail[0]?.msg ?? "Validation failed"
    }
    if (typeof errDetail === "string" && errDetail) {
      return errDetail
    }
  }

  return err.message || "An unexpected error occurred. Please try again."
}

function extractErrorTitle(err: Error): string {
  if (err instanceof AxiosError && err.code === "ERR_NETWORK") {
    return "Connection Error"
  }

  if (err instanceof ApiError) {
    if (err.status === 429) return "Too Many Requests"
    if (err.status === 422) return "Validation Error"
    if (err.status >= 500) return "Server Error"
  }

  return "Error"
}

export const handleError = function (
  this: (description: string, title?: string) => void,
  err: Error,
) {
  const errorMessage = extractErrorMessage(err)
  const errorTitle = extractErrorTitle(err)
  this(errorMessage, errorTitle)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
