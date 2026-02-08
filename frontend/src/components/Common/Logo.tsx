import { Link } from "@tanstack/react-router"
import { Home } from "lucide-react"

import { cn } from "@/lib/utils"

interface IProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

/******************************************************************************
                              Components
******************************************************************************/

/** HeimPath logo icon. */
function LogoIcon(props: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-blue-600 text-white",
        props.className
      )}
    >
      <Home className="h-4 w-4" />
    </div>
  )
}

/** HeimPath full logo with text. */
function LogoFull(props: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", props.className)}>
      <LogoIcon className="h-8 w-8" />
      <span className="text-xl font-bold tracking-tight">
        Heim<span className="text-blue-600">Path</span>
      </span>
    </div>
  )
}

/** Default component. Display HeimPath logo. */
function Logo(props: IProps) {
  const { variant = "full", className, asLink = true } = props

  const content =
    variant === "responsive" ? (
      <>
        <div className="group-data-[collapsible=icon]:hidden">
          <LogoFull className={className} />
        </div>
        <div className="hidden group-data-[collapsible=icon]:block">
          <LogoIcon className={cn("h-8 w-8", className)} />
        </div>
      </>
    ) : variant === "full" ? (
      <LogoFull className={className} />
    ) : (
      <LogoIcon className={cn("h-8 w-8", className)} />
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}

/******************************************************************************
                              Export
******************************************************************************/

export { Logo }
