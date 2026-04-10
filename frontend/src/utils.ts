import { AxiosError } from "axios"
import { ApiError } from "./client/core/ApiError"

function extractErrorMessage(err: Error): string {
  if (err instanceof AxiosError) {
    return err.message
  }

  if (err instanceof ApiError) {
    const errDetail = (err.body as Record<string, unknown>)?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      return errDetail[0].msg
    }
    if (typeof errDetail === "string" && errDetail) {
      return errDetail
    }
  }

  return err.message || "Something went wrong."
}

export const handleError = function (this: (msg: string) => void, err: Error) {
  const errorMessage = extractErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
