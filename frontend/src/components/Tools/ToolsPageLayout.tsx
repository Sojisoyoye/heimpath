import type { ReactNode } from "react"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  title: string
  description: string
  children: ReactNode
}

/******************************************************************************
                              Components
******************************************************************************/

/** Page layout for individual tool pages with an h1 heading and description. */
function ToolsPageLayout(props: Readonly<IProps>) {
  const { title, description, children } = props

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ToolsPageLayout }
