/**
 * Article Card Component
 * Displays an article summary in a card format
 */

import { Link } from "@tanstack/react-router"
import { Clock, Eye } from "lucide-react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  ArticleCategory,
  ArticleSummary,
  DifficultyLevel,
} from "@/models/article"

interface IProps {
  article: ArticleSummary
  showCategory?: boolean
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  buying_process: "Buying Process",
  costs_and_taxes: "Costs & Taxes",
  regulations: "Regulations",
  common_pitfalls: "Common Pitfalls",
}

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  buying_process:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  costs_and_taxes:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  regulations:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  common_pitfalls:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Article summary card. */
function ArticleCard(props: IProps) {
  const { article, showCategory = true, className } = props

  return (
    <Card className={cn("transition-shadow hover:shadow-md group", className)}>
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {showCategory && (
              <Badge
                variant="outline"
                className={cn("text-xs", CATEGORY_COLORS[article.category])}
              >
                {CATEGORY_LABELS[article.category]}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                DIFFICULTY_COLORS[article.difficultyLevel],
              )}
            >
              {DIFFICULTY_LABELS[article.difficultyLevel]}
            </Badge>
          </div>
          <Link
            to="/articles/$slug"
            params={{ slug: article.slug }}
            className="block"
          >
            <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors line-clamp-2">
              {article.title}
            </CardTitle>
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTimeMinutes} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.viewCount.toLocaleString()} views
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {article.excerpt}
        </p>
        <Link
          to="/articles/$slug"
          params={{ slug: article.slug }}
          className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Read more →
        </Link>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export {
  ArticleCard,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
}
