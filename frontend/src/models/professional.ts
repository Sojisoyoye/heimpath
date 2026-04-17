/**
 * Professional network directory models
 */

export type ProfessionalType =
  | "lawyer"
  | "notary"
  | "tax_advisor"
  | "mortgage_broker"
  | "real_estate_agent"

export interface Professional {
  id: string
  name: string
  type: ProfessionalType
  city: string
  languages: string
  description?: string
  email?: string
  phone?: string
  website?: string
  isVerified: boolean
  averageRating: number
  reviewCount: number
  createdAt: string
}

export interface ProfessionalReview {
  id: string
  professionalId: string
  userId: string
  rating: number
  comment?: string
  createdAt: string
}

export interface ProfessionalDetail extends Professional {
  reviews: ProfessionalReview[]
}

export interface ProfessionalFilter {
  type?: ProfessionalType
  city?: string
  language?: string
  minRating?: number
  page?: number
  pageSize?: number
}

export const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  lawyer: "Lawyer",
  notary: "Notary",
  tax_advisor: "Tax Advisor",
  mortgage_broker: "Mortgage Broker",
  real_estate_agent: "Real Estate Agent",
}
