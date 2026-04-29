import * as React from "react"

import { cn } from "@/lib/utils"

interface IProps {
  children: React.ReactNode
  className?: string
}

function Disclaimer({ children, className }: Readonly<IProps>) {
  return (
    <div
      className={cn(
        "rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { Disclaimer }
