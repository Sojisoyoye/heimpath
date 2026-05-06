/**
 * Mortgage Eligibility Guide Types
 * TypeScript interfaces for non-citizen mortgage eligibility data
 */

export type NationalityGroup =
  | "eu_eea"
  | "non_eu_permanent"
  | "non_eu_limited"
  | "non_resident"

export type EmploymentType =
  | "employed"
  | "self_employed"
  | "freelance"
  | "non_german_income"

export type PropertyUse = "primary" | "rental"

export type EligibilityStatus =
  | "easy"
  | "conditional"
  | "difficult"
  | "not_available"

export interface ILenderResult {
  lenderType: string
  lenderExamples: string
  eligibility: EligibilityStatus
  maxLtv: number | null
  minDownPayment: number | null
  notes: string[]
}

export interface IEligibilityProfile {
  overallStatus: EligibilityStatus
  summary: string
  keyRequirements: string[]
  employmentNotes: Record<EmploymentType, string[]>
  rentalNote: string
  lenders: ILenderResult[]
}
