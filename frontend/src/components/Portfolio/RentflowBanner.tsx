/**
 * Rentflow Hand-off Banner
 * Shown when a user has 6+ properties — suggests Rentflow for advanced accounting.
 */

import { ExternalLink, X } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"

/******************************************************************************
                              Constants
******************************************************************************/

const STORAGE_KEY = "rentflow_prompt_dismissed"
const RENTFLOW_URL = "https://www.rentflow.de"
const PROPERTY_THRESHOLD = 6

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  propertyCount: number
}

/** Dismissible banner recommending Rentflow for large portfolios (6+ properties). */
function RentflowBanner({ propertyCount }: Readonly<IProps>) {
  const [dismissed, setDismissed] = React.useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  )

  if (propertyCount < PROPERTY_THRESHOLD || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setDismissed(true)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-950/20">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">
            Managing {propertyCount}+ properties?
          </span>{" "}
          Rentflow connects to 1,100+ German banks for automatic rent tracking
          and DATEV-ready accounting.
        </p>
        <Button
          variant="link"
          size="sm"
          className="h-auto shrink-0 p-0 text-sm text-blue-700 dark:text-blue-400"
          asChild
        >
          <a
            href={RENTFLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            Learn about Rentflow
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
      <button
        type="button"
        aria-label="Dismiss Rentflow suggestion"
        onClick={handleDismiss}
        className="shrink-0 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentflowBanner }
