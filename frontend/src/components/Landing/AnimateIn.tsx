import type { CSSProperties, ReactNode } from "react"
import { useMemo } from "react"

import { useInView } from "@/hooks/useInView"

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  children: ReactNode
  delayMs?: number
  className?: string
}

/** Wrapper that fades in children when they scroll into view. */
function AnimateIn(props: IProps) {
  const { children, delayMs, className } = props
  const [ref, isInView] = useInView()

  const style = useMemo<CSSProperties | undefined>(
    () => (delayMs ? { animationDelay: `${delayMs}ms` } : undefined),
    [delayMs],
  )

  return (
    <div
      ref={ref}
      className={
        isInView
          ? `animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards motion-reduce:animate-none ${className ?? ""}`
          : `opacity-0 ${className ?? ""}`
      }
      style={isInView ? style : undefined}
    >
      {children}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AnimateIn }
