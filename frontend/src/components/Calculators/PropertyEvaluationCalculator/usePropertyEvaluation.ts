/**
 * Property Evaluation Calculator hook
 * Calls the server-side calculation engine via a debounced API mutation
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { CalculatorService } from "@/services/CalculatorService"
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)

  const isValid =
    state.propertyInfo.purchasePrice > 0 && state.propertyInfo.squareMeters > 0

  const doCalculate = useCallback(
    async (input: PropertyEvaluationState) => {
      abortRef.current = false
      setIsLoading(true)
      try {
        const data =
          await CalculatorService.calculatePropertyEvaluation(input)
        if (!abortRef.current) {
          setResults(data)
          setError(null)
        }
      } catch (err) {
        if (!abortRef.current) {
          setResults(null)
          setError(err as Error)
        }
      } finally {
        if (!abortRef.current) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

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
      doCalculate(state)
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      abortRef.current = true
    }
  }, [state, isValid, doCalculate])

  return {
    results,
    isValid,
    isLoading,
    error,
  }
}

/******************************************************************************
                              Export
******************************************************************************/

export { usePropertyEvaluation }
