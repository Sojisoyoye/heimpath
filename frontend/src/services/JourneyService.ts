/**
 * Journey Service
 * Handles all API calls related to property journeys
 *
 * Note: This service wraps API calls for journeys. Run `npm run generate-client`
 * after adding new journey endpoints to regenerate the typed client.
 */

import { OpenAPI } from "@/client";
import { request } from "@/client/core/request";
import { PATHS } from "./common/Paths";
import type {
  JourneyCreate,
  JourneyPublic,
  JourneyProgress,
  JourneyStepUpdate,
  JourneyTaskUpdate,
  NextStepRecommendation,
} from "@/models/journey";

interface JourneyListResponse {
  data: JourneyPublic[];
  count: number;
}

class JourneyServiceClass {
  /**
   * Get all journeys for the current user
   */
  async getJourneys(): Promise<JourneyPublic[]> {
    const response = await request<JourneyListResponse>(OpenAPI, {
      method: "GET",
      url: PATHS.JOURNEYS.LIST,
    });
    return response.data;
  }

  /**
   * Get a specific journey by ID
   */
  async getJourney(journeyId: string): Promise<JourneyPublic> {
    return request<JourneyPublic>(OpenAPI, {
      method: "GET",
      url: PATHS.JOURNEYS.DETAIL(journeyId),
    });
  }

  /**
   * Create a new journey from questionnaire answers
   */
  async createJourney(data: JourneyCreate): Promise<JourneyPublic> {
    return request<JourneyPublic>(OpenAPI, {
      method: "POST",
      url: PATHS.JOURNEYS.CREATE,
      body: data,
      mediaType: "application/json",
    });
  }

  /**
   * Get journey progress
   */
  async getProgress(journeyId: string): Promise<JourneyProgress> {
    return request<JourneyProgress>(OpenAPI, {
      method: "GET",
      url: PATHS.JOURNEYS.PROGRESS(journeyId),
    });
  }

  /**
   * Get next recommended step
   */
  async getNextStep(journeyId: string): Promise<NextStepRecommendation> {
    return request<NextStepRecommendation>(OpenAPI, {
      method: "GET",
      url: PATHS.JOURNEYS.NEXT_STEP(journeyId),
    });
  }

  /**
   * Update a journey step status
   */
  async updateStep(
    journeyId: string,
    stepId: string,
    data: JourneyStepUpdate
  ): Promise<void> {
    await request<void>(OpenAPI, {
      method: "PATCH",
      url: PATHS.JOURNEYS.UPDATE_STEP(journeyId, stepId),
      body: data,
      mediaType: "application/json",
    });
  }

  /**
   * Update a task within a step
   */
  async updateTask(
    journeyId: string,
    stepId: string,
    taskId: string,
    data: JourneyTaskUpdate
  ): Promise<void> {
    await request<void>(OpenAPI, {
      method: "PATCH",
      url: PATHS.JOURNEYS.UPDATE_TASK(journeyId, stepId, taskId),
      body: data,
      mediaType: "application/json",
    });
  }
}

export const JourneyService = new JourneyServiceClass();
