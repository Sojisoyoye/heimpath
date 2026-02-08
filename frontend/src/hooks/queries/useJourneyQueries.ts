/**
 * Journey Query Hooks
 * React Query hooks for journey data fetching
 */

import { useQuery } from "@tanstack/react-query";
import { JourneyService } from "@/services/JourneyService";
import { queryKeys } from "@/query/queryKeys";

/**
 * Get all journeys for the current user
 */
export function useJourneys() {
  return useQuery({
    queryKey: queryKeys.journeys.list(),
    queryFn: () => JourneyService.getJourneys(),
  });
}

/**
 * Get a specific journey by ID
 */
export function useJourney(journeyId: string) {
  return useQuery({
    queryKey: queryKeys.journeys.detail(journeyId),
    queryFn: () => JourneyService.getJourney(journeyId),
    enabled: !!journeyId,
  });
}

/**
 * Get journey progress
 */
export function useJourneyProgress(journeyId: string) {
  return useQuery({
    queryKey: queryKeys.journeys.progress(journeyId),
    queryFn: () => JourneyService.getProgress(journeyId),
    enabled: !!journeyId,
  });
}

/**
 * Get next recommended step
 */
export function useNextStep(journeyId: string) {
  return useQuery({
    queryKey: queryKeys.journeys.nextStep(journeyId),
    queryFn: () => JourneyService.getNextStep(journeyId),
    enabled: !!journeyId,
  });
}
