/**
 * Centralized API path definitions
 * All API endpoints should be defined here for consistency
 */

const API_V1 = "/api/v1";

export const PATHS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_V1}/login/access-token`,
    REGISTER: `${API_V1}/auth/register`,
    VERIFY_EMAIL: `${API_V1}/auth/verify-email`,
    FORGOT_PASSWORD: (email: string) => `${API_V1}/password-recovery/${email}`,
    RESET_PASSWORD: `${API_V1}/reset-password`,
  },

  // Users
  USERS: {
    ME: `${API_V1}/users/me`,
    EXPORT: `${API_V1}/users/me/export`,
    DETAIL: (id: string) => `${API_V1}/users/${id}`,
  },

  // Journeys
  JOURNEYS: {
    LIST: `${API_V1}/journeys`,
    CREATE: `${API_V1}/journeys`,
    DETAIL: (id: string) => `${API_V1}/journeys/${id}`,
    PROGRESS: (id: string) => `${API_V1}/journeys/${id}/progress`,
    NEXT_STEP: (id: string) => `${API_V1}/journeys/${id}/next-step`,
    UPDATE_STEP: (journeyId: string, stepId: string) =>
      `${API_V1}/journeys/${journeyId}/steps/${stepId}`,
    UPDATE_TASK: (journeyId: string, stepId: string, taskId: string) =>
      `${API_V1}/journeys/${journeyId}/steps/${stepId}/tasks/${taskId}`,
  },

  // Legal Knowledge Base
  LAWS: {
    LIST: `${API_V1}/laws`,
    SEARCH: `${API_V1}/laws/search`,
    DETAIL: (id: string) => `${API_V1}/laws/${id}`,
    CATEGORIES: `${API_V1}/laws/categories`,
    BOOKMARK: (id: string) => `${API_V1}/laws/${id}/bookmark`,
    BOOKMARKS: `${API_V1}/laws/bookmarks`,
    BY_JOURNEY_STEP: (stepKey: string) =>
      `${API_V1}/laws/by-journey-step/${stepKey}`,
  },

  // Subscriptions
  SUBSCRIPTIONS: {
    CURRENT: `${API_V1}/subscriptions/current`,
    CHECKOUT: `${API_V1}/subscriptions/checkout`,
    PORTAL: `${API_V1}/subscriptions/portal`,
  },

  // Calculators
  CALCULATORS: {
    HIDDEN_COSTS: `${API_V1}/calculators/hidden-costs`,
    HIDDEN_COSTS_DETAIL: (id: string) =>
      `${API_V1}/calculators/hidden-costs/${id}`,
    HIDDEN_COSTS_SHARE: (shareId: string) =>
      `${API_V1}/calculators/hidden-costs/share/${shareId}`,
    STATE_RATES: `${API_V1}/calculators/state-rates`,
    ROI: `${API_V1}/calculators/roi`,
    ROI_DETAIL: (id: string) => `${API_V1}/calculators/roi/${id}`,
    ROI_COMPARE: `${API_V1}/calculators/roi/compare`,
  },

  // Dashboard
  DASHBOARD: {
    OVERVIEW: `${API_V1}/dashboard`,
    ACTIVITY: `${API_V1}/dashboard/activity`,
    RECOMMENDATIONS: `${API_V1}/dashboard/recommendations`,
  },
} as const;
