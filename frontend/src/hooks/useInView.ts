import { useCallback, useEffect, useRef, useState } from "react"

/******************************************************************************
                              Hook
******************************************************************************/

interface IUseInViewOptions {
  threshold?: number
  triggerOnce?: boolean
}

/**
 * Detects when an element enters the viewport using IntersectionObserver.
 * Respects `prefers-reduced-motion` by immediately returning `true`.
 */
function useInView(options: IUseInViewOptions = {}) {
  const { threshold = 0.1, triggerOnce = true } = options
  const [isInView, setIsInView] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (!node || prefersReducedMotion) {
        return
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            if (triggerOnce && observerRef.current) {
              observerRef.current.disconnect()
              observerRef.current = null
            }
          } else if (!triggerOnce) {
            setIsInView(false)
          }
        },
        { threshold },
      )

      observerRef.current.observe(node)
    },
    [threshold, triggerOnce, prefersReducedMotion],
  )

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // If reduced motion is preferred, always report as in view
  if (prefersReducedMotion) {
    return [ref, true] as const
  }

  return [ref, isInView] as const
}

/******************************************************************************
                              Export
******************************************************************************/

export { useInView }
