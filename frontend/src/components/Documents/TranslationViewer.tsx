/**
 * Translation Viewer Component
 * Side-by-side original/translated text with page navigation
 */

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TranslatedPage } from "@/models/document"

interface IProps {
  pages: TranslatedPage[]
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Side-by-side translation viewer with page nav. */
function TranslationViewer(props: IProps) {
  const { pages } = props
  const [currentPage, setCurrentPage] = useState(0)

  if (!pages.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No translated content available
      </div>
    )
  }

  const page = pages[currentPage]

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
              {page.originalText || "No text extracted from this page"}
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
