/**
 * Glossary Term Tooltip Component
 * Wraps a matched German term with an inline definition tooltip
 */

import { Link } from "@tanstack/react-router"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { GlossaryLink } from "@/models/document"

interface IProps {
  term: string
  glossaryLink: GlossaryLink
}

/******************************************************************************
                              Components
******************************************************************************/

/** Wraps a German legal term with a hover tooltip showing its definition. */
function GlossaryTermTooltip({ term, glossaryLink }: Readonly<IProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted decoration-primary cursor-help text-primary">
          {term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 p-3" side="top">
        <p className="font-semibold text-xs">{glossaryLink.termDe}</p>
        <p className="text-xs text-muted-foreground mb-1">
          {glossaryLink.termEn}
        </p>
        <p className="text-xs leading-snug">{glossaryLink.definitionShort}</p>
        <Link
          to="/glossary/$slug"
          params={{ slug: glossaryLink.slug }}
          className="text-xs text-primary hover:underline mt-1 block"
        >
          View full entry →
        </Link>
      </TooltipContent>
    </Tooltip>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossaryTermTooltip }
