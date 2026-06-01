"use client"

import { useEffect, useState } from "react"

// Tailwind's `md` breakpoint. Anything below this is treated as "mobile".
const MOBILE_BREAKPOINT = 768

/**
 * SSR-safe viewport detection. Returns `undefined` until mounted on the client
 * so callers can avoid rendering heavy/desktop-only widgets during hydration,
 * then resolves to a stable boolean that tracks viewport changes.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}
