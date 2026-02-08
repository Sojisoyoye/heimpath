/**
 * Legal domain models
 * TypeScript interfaces for the legal knowledge base
 */

export type LawCategoryType =
  | "buying_process"
  | "costs_taxes"
  | "rental_landlord"
  | "condominium"
  | "agent_regulations";

export type PropertyTypeApplicability =
  | "all"
  | "apartment"
  | "house"
  | "commercial"
  | "land";

export interface LawCategory {
  key: LawCategoryType;
  name: string;
  description: string;
  lawCount: number;
}

export interface CourtRuling {
  id: string;
  caseNumber: string;
  court: string;
  date: string;
  summary: string;
  implication: string;
}

export interface StateVariation {
  id: string;
  stateCode: string;
  stateName: string;
  variation: string;
  effectiveDate?: string;
}

export interface LawSummary {
  id: string;
  citation: string;
  titleDe: string;
  titleEn: string;
  category: LawCategoryType;
  propertyType: PropertyTypeApplicability;
  oneLineSummary: string;
  isBookmarked?: boolean;
}

export interface LawDetail extends LawSummary {
  shortSummary: string;
  detailedExplanation: string;
  realWorldExample: string;
  buyerImplications?: string;
  sellerImplications?: string;
  landlordImplications?: string;
  tenantImplications?: string;
  originalTextDe?: string;
  lastAmendedDate?: string;
  courtRulings: CourtRuling[];
  stateVariations: StateVariation[];
  relatedLaws: LawSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface LawSearchResult {
  query: string;
  results: LawSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookmarkResponse {
  id: string;
  lawId: string;
  userId: string;
  notes?: string;
  law: LawSummary;
  createdAt: string;
}

export interface LawFilter {
  category?: LawCategoryType;
  propertyType?: PropertyTypeApplicability;
  state?: string;
  page?: number;
  pageSize?: number;
}
