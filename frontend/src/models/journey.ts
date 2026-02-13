/**
 * Journey domain models
 * TypeScript interfaces for property buying journeys
 * Note: Uses snake_case to match backend API response
 */

export type JourneyPhase = "research" | "preparation" | "buying" | "closing";

export type StepStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type PropertyType = "apartment" | "house" | "multi_family" | "commercial" | "land";

export type FinancingType = "cash" | "mortgage" | "mixed";

export type ResidencyStatus = "german_citizen" | "eu_citizen" | "non_eu_resident" | "non_resident";

export interface JourneyTask {
  id: string;
  order: number;
  title: string;
  description?: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  resource_url?: string;
  resource_type?: string;
}

export interface JourneyStep {
  id: string;
  step_number: number;
  phase: JourneyPhase;
  title: string;
  description?: string;
  status: StepStatus;
  estimated_duration_days?: number;
  started_at?: string;
  completed_at?: string;
  content_key?: string;
  related_laws?: string;
  estimated_costs?: string;
  tasks: JourneyTask[];
}

export interface JourneyPublic {
  id: string;
  title: string;
  current_phase: JourneyPhase;
  current_step_number: number;
  property_type?: PropertyType;
  property_location?: string;
  financing_type?: FinancingType;
  is_first_time_buyer: boolean;
  has_german_residency: boolean;
  budget_euros?: number;
  target_purchase_date?: string;
  property_goals?: PropertyGoals;
  started_at?: string;
  completed_at?: string;
  is_active: boolean;
  created_at: string;
  steps: JourneyStep[];
}

/** Frontend wizard state for creating a journey */
export interface JourneyWizardData {
  propertyType: PropertyType;
  targetState: string;
  financingType: FinancingType;
  budgetMin?: number;
  budgetMax?: number;
  residencyStatus: ResidencyStatus;
  targetDate?: string;
}

/** Backend-compatible questionnaire answers */
export interface QuestionnaireAnswers {
  property_type: PropertyType;
  property_location: string;
  financing_type: FinancingType;
  is_first_time_buyer: boolean;
  has_german_residency: boolean;
  budget_euros?: number;
  target_purchase_date?: string;
}

/** Backend-compatible journey creation request */
export interface JourneyCreate {
  title?: string;
  questionnaire: QuestionnaireAnswers;
}

export interface JourneyProgress {
  journey_id: string;
  total_steps: number;
  completed_steps: number;
  current_step_number: number;
  current_phase: JourneyPhase;
  progress_percentage: number;
  estimated_days_remaining?: number;
  phases: Record<string, { total: number; completed: number }>;
}

export interface JourneyStepUpdate {
  status?: StepStatus;
}

export interface JourneyTaskUpdate {
  is_completed: boolean;
}

export interface NextStepRecommendation {
  has_next: boolean;
  step?: JourneyStep;
  message?: string;
}

/** Property goals from Step 1 */
export interface PropertyGoals {
  preferred_property_type?: string;
  min_rooms?: number;
  min_bathrooms?: number;
  preferred_floor?: string;
  has_elevator_required?: boolean;
  features?: string[];
  min_size_sqm?: number;
  max_size_sqm?: number;
  additional_notes?: string;
  is_completed?: boolean;
}

/** Property goals update request */
export interface PropertyGoalsUpdate {
  preferred_property_type?: string;
  min_rooms?: number;
  min_bathrooms?: number;
  preferred_floor?: string;
  has_elevator_required?: boolean;
  features?: string[];
  min_size_sqm?: number;
  max_size_sqm?: number;
  additional_notes?: string;
  is_completed?: boolean;
}
