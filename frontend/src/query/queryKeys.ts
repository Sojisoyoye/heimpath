/**
 * Centralized query key factory for React Query
 * Follows the query key factory pattern for type-safe, consistent cache keys
 */

export const queryKeys = {
  // User queries
  users: {
    all: ["users"] as const,
    current: () => [...queryKeys.users.all, "current"] as const,
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },

  // Journey queries
  journeys: {
    all: ["journeys"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.journeys.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.journeys.all, "detail", id] as const,
    progress: (id: string) =>
      [...queryKeys.journeys.all, "progress", id] as const,
    nextStep: (id: string) =>
      [...queryKeys.journeys.all, "nextStep", id] as const,
  },

  // Legal knowledge base queries
  laws: {
    all: ["laws"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.laws.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.laws.all, "detail", id] as const,
    search: (query: string) =>
      [...queryKeys.laws.all, "search", query] as const,
    categories: () => [...queryKeys.laws.all, "categories"] as const,
    bookmarks: () => [...queryKeys.laws.all, "bookmarks"] as const,
    byJourneyStep: (stepKey: string) =>
      [...queryKeys.laws.all, "byJourneyStep", stepKey] as const,
  },

  // Subscription queries
  subscriptions: {
    all: ["subscriptions"] as const,
    current: () => [...queryKeys.subscriptions.all, "current"] as const,
  },

  // Calculator queries
  calculators: {
    all: ["calculators"] as const,
    hiddenCosts: (id: string) =>
      [...queryKeys.calculators.all, "hiddenCosts", id] as const,
    hiddenCostsList: () =>
      [...queryKeys.calculators.all, "hiddenCostsList"] as const,
    hiddenCostsShare: (shareId: string) =>
      [...queryKeys.calculators.all, "hiddenCostsShare", shareId] as const,
    stateComparison: (price: number, includeAgent: boolean) =>
      [
        ...queryKeys.calculators.all,
        "stateComparison",
        price,
        includeAgent,
      ] as const,
    roi: (id: string) => [...queryKeys.calculators.all, "roi", id] as const,
    roiList: () => [...queryKeys.calculators.all, "roiList"] as const,
    roiShare: (shareId: string) =>
      [...queryKeys.calculators.all, "roiShare", shareId] as const,
    stateRates: () => [...queryKeys.calculators.all, "stateRates"] as const,
    propertyEvaluation: (id: string) =>
      [...queryKeys.calculators.all, "propertyEvaluation", id] as const,
    propertyEvaluationList: () =>
      [...queryKeys.calculators.all, "propertyEvaluationList"] as const,
    propertyEvaluationShare: (shareId: string) =>
      [
        ...queryKeys.calculators.all,
        "propertyEvaluationShare",
        shareId,
      ] as const,
    propertyEvaluationStep: (stepId: string) =>
      [...queryKeys.calculators.all, "propertyEvaluationStep", stepId] as const,
  },

  // Financing queries
  financing: {
    all: ["financing"] as const,
    eligibility: (id: string) =>
      [...queryKeys.financing.all, "eligibility", id] as const,
    eligibilityList: () =>
      [...queryKeys.financing.all, "eligibilityList"] as const,
    eligibilityShare: (shareId: string) =>
      [...queryKeys.financing.all, "eligibilityShare", shareId] as const,
  },

  // Document queries
  documents: {
    all: ["documents"] as const,
    list: (page?: number, filters?: Record<string, unknown>) =>
      [...queryKeys.documents.all, "list", page, filters] as const,
    detail: (id: string) => [...queryKeys.documents.all, "detail", id] as const,
    translation: (id: string) =>
      [...queryKeys.documents.all, "translation", id] as const,
    status: (id: string) => [...queryKeys.documents.all, "status", id] as const,
    shared: (shareId: string) =>
      [...queryKeys.documents.all, "shared", shareId] as const,
    usage: () => [...queryKeys.documents.all, "usage"] as const,
  },

  // Notification queries
  notifications: {
    all: ["notifications"] as const,
    list: (limit?: number, offset?: number, unreadOnly?: boolean) =>
      [
        ...queryKeys.notifications.all,
        "list",
        limit,
        offset,
        unreadOnly,
      ] as const,
    preferences: () => [...queryKeys.notifications.all, "preferences"] as const,
  },

  // Article queries
  articles: {
    all: ["articles"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.articles.all, "list", filters] as const,
    detail: (slug: string) =>
      [...queryKeys.articles.all, "detail", slug] as const,
    search: (query: string) =>
      [...queryKeys.articles.all, "search", query] as const,
    categories: () => [...queryKeys.articles.all, "categories"] as const,
  },

  // Search queries
  search: {
    all: ["search"] as const,
    global: (query: string) =>
      [...queryKeys.search.all, "global", query] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ["dashboard"] as const,
    overview: () => [...queryKeys.dashboard.all, "overview"] as const,
    activity: () => [...queryKeys.dashboard.all, "activity"] as const,
    recommendations: () =>
      [...queryKeys.dashboard.all, "recommendations"] as const,
  },
} as const
