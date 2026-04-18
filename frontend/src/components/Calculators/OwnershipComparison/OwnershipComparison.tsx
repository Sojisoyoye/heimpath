/**
 * Ownership Comparison (GmbH vs. Private)
 * Main orchestrator: manages state, mutations, and layout
 */

import { Scale } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  useCalculateOwnershipComparison,
  useDeleteOwnershipComparison,
  useSaveOwnershipComparison,
} from "@/hooks/mutations/useCalculatorMutations"
import { useUserOwnershipComparisons } from "@/hooks/queries/useCalculatorQueries"
import useCustomToast from "@/hooks/useCustomToast"
import type {
  OwnershipComparisonInput,
  OwnershipComparisonResult,
} from "@/models/ownershipComparison"
import { handleError } from "@/utils"
import { EducationalSection } from "./EducationalSection"
import { OwnershipComparisonChart } from "./OwnershipComparisonChart"
import { OwnershipComparisonForm } from "./OwnershipComparisonForm"
import { OwnershipComparisonResults } from "./OwnershipComparisonResults"
import { OwnershipComparisonTable } from "./OwnershipComparisonTable"

interface IProps {
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipComparison(props: IProps) {
  const { className } = props

  const [results, setResults] = useState<OwnershipComparisonResult | null>(null)
  const [lastInputs, setLastInputs] = useState<OwnershipComparisonInput | null>(
    null,
  )

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const calculateMutation = useCalculateOwnershipComparison()
  const saveMutation = useSaveOwnershipComparison()
  const deleteMutation = useDeleteOwnershipComparison()
  const { data: savedComparisons } = useUserOwnershipComparisons()

  const handleCalculate = (inputs: OwnershipComparisonInput) => {
    setLastInputs(inputs)
    calculateMutation.mutate(inputs, {
      onSuccess: (data) => setResults(data),
      onError: handleError.bind(showErrorToast),
    })
  }

  const handleSave = (name: string) => {
    if (!lastInputs) return
    saveMutation.mutate(
      { ...lastInputs, name: name || undefined },
      {
        onSuccess: () => showSuccessToast("Ownership comparison saved"),
        onError: handleError.bind(showErrorToast),
      },
    )
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => showSuccessToast("Comparison deleted"),
      onError: handleError.bind(showErrorToast),
    })
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <OwnershipComparisonForm
          onCalculate={handleCalculate}
          isCalculating={calculateMutation.isPending}
        />

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Comparison Results
            </CardTitle>
            <CardDescription>
              GmbH vs. private ownership analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <OwnershipComparisonResults
                results={results}
                onSave={handleSave}
                isSaving={saveMutation.isPending}
                savedComparisons={savedComparisons?.data ?? []}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Scale className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter property details and click Calculate to compare
                  ownership structures
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart & Table */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Year-by-Year Projections</CardTitle>
            <CardDescription>
              Cumulative net income comparison over the holding period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <OwnershipComparisonChart results={results} />
            <OwnershipComparisonTable results={results} />
          </CardContent>
        </Card>
      )}

      {/* Educational Section */}
      <EducationalSection />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipComparison }
