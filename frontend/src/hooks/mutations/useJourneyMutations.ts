/**
 * Journey Mutation Hooks
 * React Query hooks for journey mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  JourneyCreate,
  JourneyPublic,
  JourneyStepUpdate,
  JourneyTaskUpdate,
  PropertyGoalsUpdate,
  StepStatus,
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
export function useUpdateTask(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stepId,
      taskId,
      data,
    }: {
      stepId: string
      taskId: string
      data: JourneyTaskUpdate
    }) => JourneyService.updateTask(journeyId, stepId, taskId, data),
    onMutate: async ({ stepId, taskId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.journeys.detail(journeyId),
      })

      // Snapshot the previous value for rollback
      const previousJourney = queryClient.getQueryData(
        queryKeys.journeys.detail(journeyId),
      )

      // Optimistically update the task and sync step status
      queryClient.setQueryData(
        queryKeys.journeys.detail(journeyId),
        (old: unknown) => {
          if (!old) return old
          const journey = old as JourneyPublic

          const updatedSteps = journey.steps.map((step) => {
            if (step.id !== stepId) return step

            const updatedTasks = step.tasks.map((task) =>
              task.id === taskId
                ? { ...task, is_completed: data.is_completed }
                : task,
            )

            // Compute new step status from task completion
            const allDone = updatedTasks.every((t) => t.is_completed)
            const anyDone = updatedTasks.some((t) => t.is_completed)

            let newStatus: StepStatus = step.status
            if (allDone && step.status !== "completed") {
              newStatus = "completed"
            } else if (!allDone && step.status === "completed") {
              newStatus = "in_progress"
            } else if (anyDone && step.status === "not_started") {
              newStatus = "in_progress"
            }

            return { ...step, tasks: updatedTasks, status: newStatus }
          })

          // Sync journey-level current_step_number and current_phase
          let currentStepNumber = journey.current_step_number
          let currentPhase = journey.current_phase
          let completedAt = journey.completed_at

          const targetStep = updatedSteps.find((s) => s.id === stepId)
          if (targetStep) {
            const justCompleted =
              targetStep.status === "completed" &&
              journey.steps.find((s) => s.id === stepId)?.status !== "completed"
            const justReverted =
              targetStep.status === "in_progress" &&
              journey.steps.find((s) => s.id === stepId)?.status === "completed"

            if (justCompleted) {
              const nextIncomplete = updatedSteps.find(
                (s) => s.status !== "completed" && s.status !== "skipped",
              )
              if (nextIncomplete) {
                currentStepNumber = nextIncomplete.step_number
                currentPhase = nextIncomplete.phase
              } else {
                completedAt = new Date().toISOString()
              }
            } else if (justReverted) {
              currentStepNumber = targetStep.step_number
              currentPhase = targetStep.phase
              completedAt = undefined
            }
          }

          return {
            ...journey,
            steps: updatedSteps,
            current_step_number: currentStepNumber,
            current_phase: currentPhase,
            completed_at: completedAt,
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
