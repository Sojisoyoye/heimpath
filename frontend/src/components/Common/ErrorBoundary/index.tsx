import * as Sentry from "@sentry/react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

/******************************************************************************
                              Constants
******************************************************************************/

const FALLBACK_TITLE = "Something went wrong"
const FALLBACK_MESSAGE =
  "An unexpected error occurred. You can try reloading the page or returning to the dashboard."

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  children: ReactNode
  /** Optional custom fallback. If omitted the default fallback UI is shown. */
  fallback?: ReactNode
}

interface IState {
  hasError: boolean
  eventId: string | null
}

/******************************************************************************
                              Components
******************************************************************************/

/**
 * Global React Error Boundary.
 *
 * Catches render-time exceptions that would otherwise produce a white screen.
 * Captures the error to Sentry (when configured) and renders a fallback UI
 * with recovery actions.
 *
 * Error Boundaries must be class components — this is a React requirement.
 */
class ErrorBoundary extends Component<Readonly<IProps>, IState> {
  constructor(props: Readonly<IProps>) {
    super(props)
    this.state = { hasError: false, eventId: null }
  }

  static getDerivedStateFromError(_error: Error): IState {
    return { hasError: true, eventId: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })
    this.setState({ eventId: eventId ?? null })
  }

  render(): ReactNode {
    const { hasError, eventId } = this.state
    const { children, fallback } = this.props

    if (!hasError) {
      return children
    }

    if (fallback) {
      return fallback
    }

    return (
      <div
        className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center"
        data-testid="error-boundary-fallback"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl font-bold">{FALLBACK_TITLE}</span>
          <p className="max-w-md text-muted-foreground">{FALLBACK_MESSAGE}</p>
          {eventId && (
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-mono">{eventId}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button asChild>
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </div>
      </div>
    )
  }
}

/******************************************************************************
                              Export
******************************************************************************/

export default ErrorBoundary
