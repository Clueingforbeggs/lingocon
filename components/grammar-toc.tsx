"use client"

import { useEffect, useState, useCallback } from "react"
import type { TipTapHeading } from "@/lib/utils/tiptap-headings"
import { cn } from "@/lib/utils"

interface GrammarTOCProps {
  headings: TipTapHeading[]
  className?: string
}

/**
 * Sticky table of contents for a grammar page.
 * Highlights the heading currently in the viewport via IntersectionObserver.
 */
export function GrammarTOC({ headings, className }: GrammarTOCProps) {
  const [activeId, setActiveId] = useState<string>("")

  // Track which heading is in view
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    )

    headings.forEach(h => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveId(id)
    }
  }, [])

  if (headings.length < 2) return null

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        "sticky top-24 hidden xl:block w-52 shrink-0 self-start text-sm",
        className
      )}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border/50">
        {headings.map(h => (
          <li key={h.id}>
            <button
              onClick={() => handleClick(h.id)}
              className={cn(
                "block w-full text-left py-0.5 leading-snug transition-colors",
                "hover:text-foreground",
                h.level === 1 && "pl-3 font-medium",
                h.level === 2 && "pl-5",
                h.level === 3 && "pl-7 text-xs",
                activeId === h.id
                  ? "text-primary border-l-2 border-primary -ml-px"
                  : "text-muted-foreground"
              )}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
