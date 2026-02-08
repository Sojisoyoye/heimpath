/**
 * Journey domain models
 * TypeScript interfaces for property buying journeys
 */

export type JourneyPhase = "research" | "preparation" | "buying" | "closing";

export type StepStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type PropertyType = "apartment" | "house" | "multi_family" | "commercial" | "land";

export type FinancingType = "cash" | "mortgage" | "mixed";

export type ResidencyStatus = "german_citizen" | "eu_citizen" | "non_eu_resident" | "non_resident";

export interface JourneyTask {
  id: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface JourneyStep {
  id: string;
  journeyId: string;
  stepNumber: number;
  contentKey: string;
  title: string;
  description: string;
  phase: JourneyPhase;
  status: StepStatus;
  estimatedDuration?: string;
  tasks: JourneyTask[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyPublic {
  id: string;
  userId: string;
  propertyType: PropertyType;
  targetState: string;
  financingType: FinancingType;
  budgetMin?: number;
  budgetMax?: number;
  residencyStatus: ResidencyStatus;
  currentPhase: JourneyPhase;
  currentStepNumber: number;
  targetDate?: string;
  steps: JourneyStep[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyCreate {
  propertyType: PropertyType;
  targetState: string;
  financingType: FinancingType;
  budgetMin?: number;
  budgetMax?: number;
  residencyStatus: ResidencyStatus;
  targetDate?: string;
}

export interface JourneyProgress {
  journeyId: string;
  totalSteps: number;
  completedSteps: number;
  currentPhase: JourneyPhase;
  phaseProgress: {
    research: { total: number; completed: number };
    preparation: { total: number; completed: number };
    buying: { total: number; completed: number };
    closing: { total: number; completed: number };
  };
  percentComplete: number;
  estimatedDaysRemaining?: number;
}

export interface JourneyStepUpdate {
  status?: StepStatus;
}

export interface JourneyTaskUpdate {
  isCompleted: boolean;
}

export interface NextStepRecommendation {
  stepId: string;
  stepNumber: number;
  title: string;
  description: string;
  phase: JourneyPhase;
  reason: string;
}
