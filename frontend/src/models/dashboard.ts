/**
 * Dashboard models
 * TypeScript interfaces for the dashboard overview API
 */

export type ActivityType =
  | "journey_started"
  | "step_completed"
  | "document_uploaded"
  | "calculation_saved"
  | "roi_calculated"
  | "financing_assessed"
  | "law_bookmarked"

export interface JourneyOverview {
  id: string
  title: string
  currentPhase: string
  currentStepNumber: number
  progressPercentage: number
  completedSteps: number
  totalSteps: number
  estimatedDaysRemaining: number | null
  startedAt: string | null
  nextStepTitle: string | null
  nextStepId: string | null
  phases: Record<string, { total: number; completed: number }>
}

export interface SavedDocumentSummary {
  id: string
  originalFilename: string
  documentType: string
  status: string
  createdAt: string
}

export interface SavedCalculationSummary {
  id: string
  name: string | null
  calculatorType: string
  headlineValue: string
  createdAt: string
}

export interface BookmarkedLawSummary {
  id: string
  citation: string
  titleEn: string
  category: string
  bookmarkedAt: string
}

export interface ActivityItem {
  activityType: ActivityType
  title: string
  description: string
  entityId: string
  timestamp: string
}

export interface DashboardOverview {
  journey: JourneyOverview | null
  hasJourney: boolean
  recentDocuments: SavedDocumentSummary[]
  recentCalculations: SavedCalculationSummary[]
  bookmarkedLaws: BookmarkedLawSummary[]
  recentActivity: ActivityItem[]
  documentsTranslatedThisMonth: number
  totalCalculations: number
  totalBookmarks: number
}
