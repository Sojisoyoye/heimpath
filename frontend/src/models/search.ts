/**
 * Search domain models
 */

export interface SearchResultItem {
  id: string
  title: string
  snippet: string
  resultType: "law" | "article"
  urlPath: string
}

export interface GlobalSearchResponse {
  query: string
  laws: SearchResultItem[]
  articles: SearchResultItem[]
  totalCount: number
}
