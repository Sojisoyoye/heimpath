/**
 * Translation Viewer Component
 * Side-by-side original/translated text with page navigation and glossary term highlighting
 */

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GlossaryLink, TranslatedPage } from "@/models/document"
import { GlossaryTermTooltip } from "./GlossaryTermTooltip"

interface IProps {
  pages: TranslatedPage[]
  glossaryLinks?: GlossaryLink[]
}

/******************************************************************************
                              Constants
******************************************************************************/

/** Build a map of lower-cased term_de → GlossaryLink for fast lookup. */
function buildTermMap(links: GlossaryLink[]): Map<string, GlossaryLink> {
  const map = new Map<string, GlossaryLink>()
  // Sort longest first so "Grundbuchauszug" matches before "Grundbuch"
  const sorted = [...links].sort((a, b) => b.termDe.length - a.termDe.length)
  for (const link of sorted) {
    map.set(link.termDe.toLowerCase(), link)
  }
  return map
}

/******************************************************************************
                              Components
******************************************************************************/

interface IHighlightedTextProps {
  text: string
  termMap: Map<string, GlossaryLink>
  pageNumber: number
}

/** Renders text with matched glossary terms wrapped in tooltip spans. */
function HighlightedText({
  text,
  termMap,
  pageNumber,
}: Readonly<IHighlightedTextProps>) {
  if (!termMap.size) {
    return <>{text}</>
  }

  const parts: React.ReactNode[] = []
  let remaining = text
  let offset = 0

  while (remaining.length > 0) {
    let matchStart = -1
    let matchedTerm = ""
    let matchedLink: GlossaryLink | undefined

    // Find earliest matching term in remaining text
    for (const [lower, link] of termMap) {
      if (!link.pageNumbers.includes(pageNumber)) {
        continue
      }
      const idx = remaining.toLowerCase().indexOf(lower)
      if (idx === -1) {
        continue
      }
      // Whole-word check: no letter immediately before or after
      const before = idx > 0 ? remaining[idx - 1] : " "
      const after =
        idx + lower.length < remaining.length
          ? remaining[idx + lower.length]
          : " "
      const letterRe = /[a-zA-ZäöüÄÖÜß]/
      if (letterRe.test(before) || letterRe.test(after)) {
        continue
      }
      if (matchStart === -1 || idx < matchStart) {
        matchStart = idx
        matchedTerm = remaining.slice(idx, idx + lower.length)
        matchedLink = link
      }
    }

    if (matchStart === -1 || !matchedLink) {
      // No more matches — push the rest as plain text
      parts.push(remaining)
      break
    }

    // Push text before match
    if (matchStart > 0) {
      parts.push(remaining.slice(0, matchStart))
    }

    // Push the tooltip span
    const key = `${matchedLink.slug}-${offset + matchStart}`
    parts.push(
      <GlossaryTermTooltip
        key={key}
        term={matchedTerm}
        glossaryLink={matchedLink}
      />,
    )

    offset += matchStart + matchedTerm.length
    remaining = remaining.slice(matchStart + matchedTerm.length)
  }

  return <>{parts}</>
}

/** Default component. Side-by-side translation viewer with page nav. */
function TranslationViewer(props: Readonly<IProps>) {
  const { pages, glossaryLinks = [] } = props
  const [currentPage, setCurrentPage] = useState(0)

  if (!pages.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No translated content available
      </div>
    )
  }

  const page = pages[currentPage]
  const termMap = buildTermMap(glossaryLinks)

  return (
    <div className="space-y-4">
      {/* Page navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Page {page.pageNumber} of {pages.length}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
            }
            disabled={currentPage >= pages.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Original (German)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {page.originalText ? (
                <HighlightedText
                  text={page.originalText}
                  termMap={termMap}
                  pageNumber={page.pageNumber}
                />
              ) : (
                "No text extracted from this page"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Translation (English)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {page.translatedText || "No translation available for this page"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TranslationViewer }
