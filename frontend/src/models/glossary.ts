/**
 * Glossary models for German real estate terminology
 */

export type GlossaryCategory =
  | "buying_process"
  | "costs_taxes"
  | "financing"
  | "legal"
  | "rental"
  | "property_types"

export interface GlossaryTermSummary {
  id: string
  termDe: string
  termEn: string
  slug: string
  definitionShort: string
  category: GlossaryCategory
}

export interface GlossaryTermDetail extends GlossaryTermSummary {
  definitionLong: string
  exampleUsage: string | null
  relatedTerms: GlossaryTermSummary[]
}

export interface GlossaryListResponse {
  data: GlossaryTermSummary[]
  total: number
  page: number
  pageSize: number
}

export interface GlossarySearchResponse {
  query: string
  results: GlossaryTermSummary[]
  total: number
}

export interface GlossaryCategoryInfo {
  id: string
  name: string
  count: number
}

export interface GlossaryFilter {
  category?: GlossaryCategory
  page?: number
  pageSize?: number
}

// Admin create/update
export interface GlossaryTermCreate {
  termDe: string
  termEn: string
  slug: string
  definitionShort: string
  definitionLong: string
  category: GlossaryCategory
  exampleUsage?: string
  relatedTerms?: string[]
}

export type GlossaryTermUpdate = Partial<GlossaryTermCreate>
