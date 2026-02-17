/**
 * Article Detail Component
 * Full article view with TOC, rating, sharing, and related content
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Eye,
  Lightbulb,
  Linkedin,
  ThumbsDown,
  ThumbsUp,
  Twitter,
} from "lucide-react"
import { useMemo, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRateArticle } from "@/hooks/mutations"
import type { ArticleDetail as ArticleDetailType } from "@/models/article"
import {
  ArticleCard,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
} from "./ArticleCard"

interface IProps {
  article: ArticleDetailType
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

interface TocItem {
  id: string
  text: string
  level: number
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for article detail. */
function ArticleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/** Table of contents sidebar. */
function TableOfContents(props: { items: TocItem[] }) {
  const { items } = props

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Table of Contents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <nav className="space-y-1">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "block text-sm text-muted-foreground hover:text-foreground transition-colors",
                item.level === 2 && "pl-0",
                item.level === 3 && "pl-4",
              )}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}

/** Key takeaways box. */
function KeyTakeaways(props: { takeaways: string[] }) {
  const { takeaways } = props

  if (takeaways.length === 0) return null

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          Key Takeaways
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {takeaways.map((takeaway, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>{takeaway}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Rating widget (thumbs up/down). */
function RatingWidget(props: {
  slug: string
  helpfulCount: number
  notHelpfulCount: number
  userRating: boolean | null
}) {
  const { slug, helpfulCount, notHelpfulCount, userRating } = props
  const rateArticle = useRateArticle()

  const handleRate = (isHelpful: boolean) => {
    rateArticle.mutate({ slug, isHelpful })
  }

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-medium text-center mb-3">
          Was this article helpful?
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={userRating === true ? "default" : "outline"}
            size="sm"
            onClick={() => handleRate(true)}
            disabled={rateArticle.isPending}
            className="gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            Yes ({helpfulCount})
          </Button>
          <Button
            variant={userRating === false ? "default" : "outline"}
            size="sm"
            onClick={() => handleRate(false)}
            disabled={rateArticle.isPending}
            className="gap-2"
          >
            <ThumbsDown className="h-4 w-4" />
            No ({notHelpfulCount})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Social share buttons. */
function ShareButtons(props: { title: string; slug: string }) {
  const { title, slug } = props
  const [copied, setCopied] = useState(false)

  const articleUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/articles/${slug}`
      : ""

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(articleUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(articleUrl)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Share:</span>
      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
          <Twitter className="h-4 w-4" />
        </a>
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
          <Linkedin className="h-4 w-4" />
        </a>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopyLink}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

/** Default component. Full article detail view. */
function ArticleDetail(props: IProps) {
  const { article, isLoading, className } = props

  // Parse headings from markdown content for TOC
  const tocItems = useMemo<TocItem[]>(() => {
    if (!article.content) return []
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    const items: TocItem[] = []
    let match = headingRegex.exec(article.content)
    while (match !== null) {
      const level = match[1].length
      const text = match[2]
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      items.push({ id, text, level })
      match = headingRegex.exec(article.content)
    }
    return items
  }, [article.content])

  if (isLoading) {
    return <ArticleDetailSkeleton />
  }

  const formattedDate = new Date(article.createdAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/articles">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Articles
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-xs", CATEGORY_COLORS[article.category])}
          >
            {CATEGORY_LABELS[article.category]}
          </Badge>
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

        <h1 className="text-3xl font-bold">{article.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span>By {article.authorName}</span>
          <span>{formattedDate}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {article.readingTimeMinutes} min read
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.viewCount.toLocaleString()} views
          </span>
        </div>

        <ShareButtons title={article.title} slug={article.slug} />
      </div>

      <Separator />

      {/* Key Takeaways */}
      <KeyTakeaways takeaways={article.keyTakeaways} />

      {/* Main content area with sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_250px]">
        {/* Article content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children, ...rest }) => {
                const text = String(children)
                const id = text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")
                return (
                  <h2 id={id} {...rest}>
                    {children}
                  </h2>
                )
              },
              h3: ({ children, ...rest }) => {
                const text = String(children)
                const id = text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")
                return (
                  <h3 id={id} {...rest}>
                    {children}
                  </h3>
                )
              },
            }}
          >
            {article.content}
          </Markdown>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 hidden lg:block">
          <TableOfContents items={tocItems} />

          {article.relatedLawIds.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Related Laws
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {article.relatedLawIds.map((lawId) => (
                  <Link
                    key={lawId}
                    to="/laws/$lawId"
                    params={{ lawId }}
                    className="block text-sm text-blue-600 hover:text-blue-700"
                  >
                    View law →
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      <Separator />

      {/* Rating */}
      <RatingWidget
        slug={article.slug}
        helpfulCount={article.helpfulCount}
        notHelpfulCount={article.notHelpfulCount}
        userRating={article.userRating}
      />

      {/* Related Articles */}
      {article.relatedArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Related Articles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {article.relatedArticles.map((related) => (
              <ArticleCard key={related.id} article={related} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ArticleDetail }
