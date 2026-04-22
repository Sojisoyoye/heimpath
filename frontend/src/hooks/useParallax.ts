import { useCallback, useEffect, useRef } from "react"

/******************************************************************************
                              Hook
******************************************************************************/

/**
 * Applies a subtle parallax translate to the referenced element based on scroll.
 * Disabled on mobile (<768px) and when `prefers-reduced-motion` is enabled.
 * Uses `requestAnimationFrame` for smooth 60fps updates.
 *
 * @param speed - Multiplier for scroll offset (0.3 = blob moves at 30% of scroll speed)
 */
function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (ref.current) {
        const offset = window.scrollY * speed
        ref.current.style.transform = `translateY(${offset}px)`
      }
    })
  }, [speed])

  useEffect(() => {
    if (prefersReducedMotion || isMobile) {
      return
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [handleScroll, prefersReducedMotion, isMobile])

  return ref
}

/******************************************************************************
                              Export
******************************************************************************/

export { useParallax }
