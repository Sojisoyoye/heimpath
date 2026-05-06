/**
 * Contract Explainer TypeScript models
 */

export type RiskLevel = "low" | "medium" | "high"
export type NotaryPriority = "essential" | "recommended" | "optional"

export interface ClauseExplanation {
  sectionName: string
  sectionNameEn: string
  originalText: string
  plainEnglishExplanation: string
  riskLevel: RiskLevel
  riskReason: string
  isUnusual: boolean
  unusualTerms: string[]
  pageNumber: number | null
}

export interface NotaryQuestion {
  question: string
  relatedClause: string
  priority: NotaryPriority
}

export interface ContractAnalysis {
  id: string
  filename: string
  shareId: string | null
  summary: string | null
  analyzedClauses: ClauseExplanation[] | null
  notaryChecklist: NotaryQuestion[] | null
  overallRiskAssessment: RiskLevel | null
  overallRiskExplanation: string | null
  purchasePrice: number | null
  clauseCount: number
  isTruncated: boolean
  createdAt: string
}

export interface ContractAnalysisListItem {
  id: string
  filename: string
  shareId: string | null
  overallRiskAssessment: RiskLevel | null
  clauseCount: number
  createdAt: string
}

export interface ContractAnalysisListResponse {
  data: ContractAnalysisListItem[]
  total: number
  page: number
  pageSize: number
}
