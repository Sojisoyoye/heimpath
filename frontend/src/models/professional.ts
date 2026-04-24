/**
 * Professional network directory models
 */

export type ProfessionalType =
  | "lawyer"
  | "notary"
  | "tax_advisor"
  | "mortgage_broker"
  | "real_estate_agent"

export type ServiceType = "buying" | "selling" | "rental" | "tax" | "legal"

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  buying: "Buying",
  selling: "Selling",
  rental: "Rental",
  tax: "Tax",
  legal: "Legal",
}

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
  recommendationRate?: number
  reviewHighlights?: {
    topServices: string[]
    avgResponseTime: number | null
  }
  clickCount: number
  createdAt: string
}

export interface ContactInquiryCreate {
  senderName: string
  senderEmail: string
  message: string
}

export interface ContactInquiry {
  id: string
  professionalId: string
  senderName: string
  senderEmail: string
  status: "pending" | "sent" | "failed"
  sentAt: string | null
  createdAt: string
}

export interface ProfessionalReview {
  id: string
  professionalId: string
  rating: number
  comment?: string
  serviceUsed?: ServiceType
  languageUsed?: string
  wouldRecommend?: boolean
  responseTimeRating?: number
  createdAt: string
}

export interface ProfessionalFilterOptions {
  cities: string[]
  languages: string[]
}

export interface ProfessionalDetail extends Professional {
  reviews: ProfessionalReview[]
}

export interface ProfessionalFilter {
  type?: ProfessionalType
  city?: string
  language?: string
  minRating?: number
  sortBy?: string
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
