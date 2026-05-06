/**
 * Journey Completion CTA
 * Celebratory card with "Add to Portfolio" action shown when ownership phase is complete
 */

import { useNavigate } from "@tanstack/react-router"
import { Building2, Loader2, PartyPopper } from "lucide-react"

import { ApiError } from "@/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCreatePropertyFromJourney } from "@/hooks/mutations"
import useCustomToast from "@/hooks/useCustomToast"

interface IProps {
  journeyId: string
}

/******************************************************************************
                              Components
******************************************************************************/

function JourneyCompletionCta(props: Readonly<IProps>) {
  const { journeyId } = props
  const navigate = useNavigate()
  const createFromJourney = useCreatePropertyFromJourney()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const handleAddToPortfolio = () => {
    createFromJourney.mutate(journeyId, {
      onSuccess: (property) => {
        showSuccessToast("Property added to your portfolio!")
        navigate({
          to: "/portfolio/$propertyId",
          params: { propertyId: property.id },
        })
      },
      onError: (err) => {
        const message =
          err instanceof ApiError && err.status === 409
            ? "This journey is already linked to a portfolio property."
            : "Failed to create portfolio property. Please try again."
        showErrorToast(message)
      },
    })
  }

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
            Your property journey is complete!
          </h3>
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            Congratulations on your purchase! Track your property's performance,
            rental income, and expenses in your portfolio.
          </p>
        </div>
        <Button
          onClick={handleAddToPortfolio}
          disabled={createFromJourney.isPending}
          className="shrink-0"
        >
          {createFromJourney.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-4 w-4" />
          )}
          Add to Portfolio
        </Button>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyCompletionCta }
