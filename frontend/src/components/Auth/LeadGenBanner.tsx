/**
 * Lead-Gen Banner
 * Non-intrusive in-page CTA shown to anonymous visitors on freemium
 * content pages (articles, glossary, laws) encouraging sign-up.
 */

import { Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isLoggedIn } from "@/hooks/useAuth"

interface IProps {
  message?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const DEFAULT_MESSAGE =
  "Sign up for a free account to bookmark articles and customize your feed."

/******************************************************************************
                              Components
******************************************************************************/

/**
 * Default component. In-line lead-generation banner for anonymous users.
 * Renders nothing for logged-in users. Use on freemium content pages
 * (articles, glossary, laws) to drive sign-ups without blocking reading.
 */
function LeadGenBanner(props: IProps) {
  const { message = DEFAULT_MESSAGE } = props

  if (isLoggedIn()) return null

  return (
    <Card className="border-dashed" role="region" aria-label="Sign up prompt">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          Get more from HeimPath
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm">
            <Link to="/signup">Sign Up Free</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/login">Log In</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LeadGenBanner }
