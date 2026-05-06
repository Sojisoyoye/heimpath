/**
 * Document domain models
 * TypeScript interfaces for document upload and translation
 */

export type DocumentType =
  | "kaufvertrag"
  | "mietvertrag"
  | "expose"
  | "nebenkostenabrechnung"
  | "grundbuchauszug"
  | "teilungserklaerung"
  | "hausgeldabrechnung"
  | "wohnungsgrundriss"
  | "weg_protokolle"
  | "unknown"

export type DocumentStatus = "uploaded" | "processing" | "completed" | "failed"

export interface DocumentSummary {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: DocumentType
  status: DocumentStatus
  shareId: string | null
  journeyStepId: string | null
  createdAt: string
}

export interface TranslatedPage {
  pageNumber: number
  originalText: string
  translatedText: string
}

export interface DetectedClause {
  clauseType: string
  originalText: string
  translatedText: string
  pageNumber: number
  riskLevel: string
  riskReason: string
  confidenceLevel: "high" | "medium" | "low"
  confidenceScore: number
}

export interface DocumentRiskWarning {
  originalTerm: string
  translatedTerm: string
  riskLevel: string
  explanation: string
  pageNumber: number | null
}

export interface AnalyzedClause {
  sectionName: string
  sectionNameEn: string
  originalText: string
  plainEnglishExplanation: string
  riskLevel: string
  riskReason: string
  isUnusual: boolean
  unusualTerms: string[]
  pageNumber: number | null
}

export interface NotaryQuestion {
  question: string
  relatedClause: string
  priority: string
}

export interface KaufvertragAnalysis {
  summary: string
  analyzedClauses: AnalyzedClause[]
  notaryChecklist: NotaryQuestion[]
  overallRiskAssessment: string
  overallRiskExplanation: string
  isAiGenerated: boolean
}

export interface RiskFlag {
  flag: string
  description: string
  riskLevel: string
}

export interface GrundbuchOwner {
  name: string
  share: string
  acquisitionDate: string | null
}

export interface GrundbuchEncumbrance {
  type: string
  beneficiary: string
  description: string
}

export interface GrundbuchCharge {
  type: string
  creditor: string
  amountEur: number | null
}

export interface GrundbuchAnalysis {
  propertyDescription: string
  abteilung1: { owners: GrundbuchOwner[] }
  abteilung2: { encumbrances: GrundbuchEncumbrance[] }
  abteilung3: { charges: GrundbuchCharge[] }
  riskFlags: RiskFlag[]
  isAiGenerated: boolean
}

export interface TeilungserklaerungAnalysis {
  unitDescription: string
  miteigentumsanteil: string
  sondereigentum: Array<{ area: string; description: string }>
  sondernutzungsrechte: Array<{ description: string; conditions: string }>
  gemeinschaftseigentum: string[]
  wegRules: Array<{ rule: string; impact: string }>
  riskFlags: RiskFlag[]
  isAiGenerated: boolean
}

export interface MietvertragAnalysis {
  monthlyRentEur: number | null
  depositEur: number | null
  noticePeriodMonths: number | null
  leaseStart: string | null
  leaseEnd: string | null
  isUnlimited: boolean
  maintenanceObligations: Array<{ party: string; obligation: string }>
  renewalClauses: Array<{ clause: string; conditions: string }>
  specialAgreements: string[]
  riskFlags: RiskFlag[]
  isAiGenerated: boolean
}

export interface WohnungsgrundrissRoom {
  nameDe: string
  nameEn: string
  areaSqm: number | null
}

export interface WohnungsgrundrissAnalysis {
  rooms: WohnungsgrundrissRoom[]
  totalAreaSqm: number | null
  floor: string | null
  features: string[]
  notes: string[]
  isAiGenerated: boolean
}

export interface WegRiskFlag {
  flag: string
  description: string
  riskLevel: "low" | "medium" | "high"
  sourceQuoteDe: string | null
  sourceQuoteEn: string | null
}

export interface WegReserveAssessment {
  reserveBalanceEur: number | null
  assessment: "adequate" | "low" | "critical" | "unknown"
  details: string
}

export interface WegUpcomingCost {
  description: string
  estimatedEur: number | null
  timeline: string | null
  sourceQuoteDe: string | null
  sourceQuoteEn: string | null
}

export interface WegDispute {
  description: string
  status: string
  sourceQuoteDe: string | null
  sourceQuoteEn: string | null
}

export interface WegProtokolleAnalysis {
  riskFlags: WegRiskFlag[]
  reserveAssessment: WegReserveAssessment | null
  upcomingCosts: WegUpcomingCost[]
  disputes: WegDispute[]
  meetingDates: string[]
  lowConfidenceWarning: boolean
  isAiGenerated: boolean
}

export interface GlossaryLink {
  termDe: string
  termEn: string
  slug: string
  definitionShort: string
  pageNumbers: number[]
}

export interface DocumentTranslation {
  id: string
  documentId: string
  sourceLanguage: string
  targetLanguage: string
  translatedPages: TranslatedPage[]
  clausesDetected: DetectedClause[]
  riskWarnings: DocumentRiskWarning[]
  kaufvertragAnalysis: KaufvertragAnalysis | null
  typeAnalysis: Record<string, unknown> | null
  glossaryLinks?: GlossaryLink[]
  processingStartedAt: string | null
  processingCompletedAt: string | null
}

export interface DocumentDetail {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: DocumentType
  status: DocumentStatus
  errorMessage: string | null
  shareId: string | null
  journeyStepId: string | null
  createdAt: string
  translation: DocumentTranslation | null
}

export interface DocumentStatusInfo {
  id: string
  status: DocumentStatus
  errorMessage: string | null
  pageCount: number
}

export interface DocumentShareResponse {
  id: string
  shareId: string
}

export interface DocumentUsageInfo {
  documentsUsed: number
  pageLimit: number
  subscriptionTier: string
}

export interface DocumentListResponse {
  data: DocumentSummary[]
  total: number
  page: number
  pageSize: number
}
