"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { FamilyTimeline } from "./family-timeline"
import { GitFork, Clock, Network } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface FamilyLanguageData {
  id: string
  name: string
  slug: string
  parentLanguageId: string | null
  externalAncestry: string | null
  ownerId: string
  createdAt?: string | Date
  owner?: { id: string; name: string | null; image: string | null }
  _count: { dictionaryEntries: number }
}

interface FamilyViewSwitcherProps {
  initialLanguages: FamilyLanguageData[]
  currentUserId: string
}

// Lazy-load ReactFlow builder — it's ~400KB and blocks the main thread on init.
// SSR is disabled because ReactFlow requires the DOM.
const LanguageFamilyBuilder = dynamic(
  () =>
    import("./language-family-builder").then(m => ({
      default: m.LanguageFamilyBuilder,
    })),
  {
    ssr: false,
    loading: () => <BuilderSkeleton />,
  }
)

function BuilderSkeleton() {
  return (
    <div className="w-full h-full bg-muted/10 flex flex-col items-center justify-center gap-6 p-8">
      {/* Fake tree structure */}
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
        {/* Root row */}
        <div className="flex justify-center gap-6">
          <Skeleton className="h-[88px] w-[200px] rounded-xl" />
        </div>
        {/* Connector lines */}
        <div className="flex gap-10 items-start">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-8 w-0.5" />
            <Skeleton className="h-[88px] w-[200px] rounded-xl" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-8 w-0.5" />
            <Skeleton className="h-[88px] w-[200px] rounded-xl" />
          </div>
        </div>
        {/* Second level */}
        <div className="flex justify-start gap-6 self-start ml-12">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-8 w-0.5" />
            <Skeleton className="h-[88px] w-[200px] rounded-xl" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 animate-pulse">
        Loading family tree…
      </p>
    </div>
  )
}

export function FamilyViewSwitcher({ initialLanguages, currentUserId }: FamilyViewSwitcherProps) {
  const [view, setView] = useState<"builder" | "timeline">("builder")
  const [pendingCount, setPendingCount] = useState(0)

  const handleViewChange = useCallback(
    (newView: "builder" | "timeline") => {
      if (newView === view) return
      if (pendingCount > 0) {
        const confirmed = window.confirm(
          `You have ${pendingCount} unsaved change${pendingCount !== 1 ? "s" : ""}. Switching views will discard them. Continue?`
        )
        if (!confirmed) return
      }
      setView(newView)
    },
    [view, pendingCount]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header bar — part of the normal document flow, never floats over the canvas */}
      <div className="shrink-0 h-11 border-b border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-between px-4 gap-4">
        {/* Left: tree stats badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Network className="h-3.5 w-3.5" />
          <span>
            {initialLanguages.length} language{initialLanguages.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Centre: view toggle */}
        <div className="flex bg-muted/50 border border-border/50 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleViewChange("builder")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              view === "builder"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitFork className="h-3.5 w-3.5" />
            Builder
            {view === "builder" && pendingCount > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              view === "timeline"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </button>
        </div>

        {/* Right: placeholder for future actions */}
        <div className="w-24" />
      </div>

      {/* Canvas — fills the remaining height exactly */}
      <div className="flex-1 overflow-hidden relative">
        {view === "builder" ? (
          <LanguageFamilyBuilder
            initialLanguages={initialLanguages}
            currentUserId={currentUserId}
            onPendingChangesChange={setPendingCount}
          />
        ) : (
          <FamilyTimeline languages={initialLanguages} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  )
}
