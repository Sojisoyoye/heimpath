/**
 * Property Evaluation Calculator hook
 * Calls the server-side calculation engine via a debounced API mutation
 */

import { useEffect, useRef, useState } from "react"

import { useCalculatePropertyEvaluation } from "@/hooks/mutations/useCalculatorMutations"
import type { EvaluationResults, PropertyEvaluationState } from "./types"

/******************************************************************************
                              Constants
******************************************************************************/

const DEBOUNCE_MS = 500

/******************************************************************************
                              Types
******************************************************************************/

interface UsePropertyEvaluationResult {
  results: EvaluationResults | null
  isValid: boolean
  isLoading: boolean
  error: Error | null
}

/******************************************************************************
                              Hook
******************************************************************************/

/** Calculate property evaluation results via debounced API call. */
function usePropertyEvaluation(
  state: PropertyEvaluationState,
): UsePropertyEvaluationResult {
  const [results, setResults] = useState<EvaluationResults | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const calculate = useCalculatePropertyEvaluation()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isValid =
    state.propertyInfo.purchasePrice > 0 && state.propertyInfo.squareMeters > 0

  useEffect(() => {
    if (!isValid) {
      setResults(null)
      setError(null)
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      calculate.mutate(state, {
        onSuccess: (data) => {
          setResults(data)
          setError(null)
        },
        onError: (err) => {
          setError(err as Error)
        },
      })
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isValid])

  return {
    results,
    isValid,
    isLoading: calculate.isPending,
    error,
  }
}

/******************************************************************************
                              Export
******************************************************************************/

export { usePropertyEvaluation }
