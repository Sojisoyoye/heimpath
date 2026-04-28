/**
 * Article models for the Content Library
 */

export type ArticleCategory =
  | "buying_process"
  | "costs_and_taxes"
  | "regulations"
  | "common_pitfalls"

export type DifficultyLevel = "beginner" | "intermediate" | "advanced"

export type ArticleStatus = "draft" | "published" | "archived"

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  category: ArticleCategory
  difficultyLevel: DifficultyLevel
  excerpt: string
  readingTimeMinutes: number
  viewCount: number
  authorName: string
  createdAt: string
}

export interface ArticleDetail extends ArticleSummary {
  metaDescription: string
  status: ArticleStatus
  content: string
  keyTakeaways: string[]
  relatedLawIds: string[]
  relatedCalculatorTypes: string[]
  updatedAt: string
  helpfulCount: number
  notHelpfulCount: number
  userRating: boolean | null
  relatedArticles: ArticleSummary[]
}

export interface ArticleSearchResult extends ArticleSummary {
  relevanceScore: number
}

export interface ArticleCategoryInfo {
  key: string
  name: string
  description: string
  articleCount: number
}

export interface ArticleFilter {
  category?: ArticleCategory
  difficultyLevel?: DifficultyLevel
  page?: number
  pageSize?: number
}

export interface ArticleRating {
  helpfulCount: number
  notHelpfulCount: number
  userRating: boolean | null
}

// Admin create/update
export interface ArticleCreate {
  title: string
  slug: string
  metaDescription: string
  category: ArticleCategory
  difficultyLevel: DifficultyLevel
  excerpt: string
  content: string
  keyTakeaways?: string[]
  authorName: string
  status?: ArticleStatus
  relatedLawIds?: string[]
  relatedCalculatorTypes?: string[]
}

export type ArticleUpdate = Partial<ArticleCreate>
