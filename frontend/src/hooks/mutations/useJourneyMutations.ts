/**
 * Journey Mutation Hooks
 * React Query hooks for journey mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  JourneyCreate,
  JourneyStepUpdate,
  JourneyTaskUpdate,
  PropertyGoalsUpdate,
} from "@/models/journey"
import { queryKeys } from "@/query/queryKeys"
import { JourneyService } from "@/services/JourneyService"

/**
 * Create a new journey
 */
export function useCreateJourney() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: JourneyCreate) => JourneyService.createJourney(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.all })
    },
  })
}

/**
 * Update a journey step status
 */
export function useUpdateStep(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stepId,
      data,
    }: {
      stepId: string
      data: JourneyStepUpdate
    }) => JourneyService.updateStep(journeyId, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.detail(journeyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.progress(journeyId),
      })
    },
  })
}

/**
 * Update a task within a step
 */
export function useUpdateTask(journeyId: string, stepId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      data: JourneyTaskUpdate
    }) => JourneyService.updateTask(journeyId, stepId, taskId, data),
    onMutate: async ({ taskId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.journeys.detail(journeyId),
      })

      // Snapshot the previous value for rollback
      const previousJourney = queryClient.getQueryData(
        queryKeys.journeys.detail(journeyId),
      )

      // Optimistically update the task
      queryClient.setQueryData(
        queryKeys.journeys.detail(journeyId),
        (old: unknown) => {
          if (!old) return old
          const journey = old as {
            steps: Array<{
              id: string
              tasks: Array<{ id: string; is_completed: boolean }>
            }>
          }
          return {
            ...journey,
            steps: journey.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    tasks: step.tasks.map((task) =>
                      task.id === taskId
                        ? { ...task, is_completed: data.is_completed }
                        : task,
                    ),
                  }
                : step,
            ),
          }
        },
      )

      return { previousJourney }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousJourney) {
        queryClient.setQueryData(
          queryKeys.journeys.detail(journeyId),
          context.previousJourney,
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.detail(journeyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.progress(journeyId),
      })
    },
  })
}

/**
 * Update property goals for a journey (Step 1)
 */
export function useUpdatePropertyGoals(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PropertyGoalsUpdate) =>
      JourneyService.updatePropertyGoals(journeyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.detail(journeyId),
      })
    },
  })
}
