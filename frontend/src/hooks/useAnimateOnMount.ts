/**
 * useAnimateOnMount
 * Returns 0 on first render, then the target value after a rAF tick
 * so CSS transitions can animate from zero. Respects prefers-reduced-motion.
 */

import { useEffect, useState } from "react"

function useAnimateOnMount(target: number): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (prefersReduced) {
      setValue(target)
      return
    }

    const id = requestAnimationFrame(() => setValue(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return value
}

export { useAnimateOnMount }
