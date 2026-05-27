"use client"

import { SearchScope } from "@/lib/services/search"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BookOpen, FileText, Globe, LayoutGrid } from "lucide-react"

interface SearchTabsProps {
    currentTab: SearchScope
    onTabChange: (tab: SearchScope) => void
    counts: {
        all: number
        languages: number
        dictionary: number
        grammar: number
        articles: number
        texts: number
    }
}

export function SearchTabs({ currentTab, onTabChange, counts }: SearchTabsProps) {
    const tabs: { id: SearchScope; label: string; icon: React.ReactNode }[] = [
        { id: "all", label: "All Results", icon: <LayoutGrid className="h-4 w-4" /> },
        { id: "languages", label: "Languages", icon: <Globe className="h-4 w-4" /> },
        { id: "dictionary", label: "Dictionary", icon: <FileText className="h-4 w-4" /> },
        { id: "grammar", label: "Grammar", icon: <BookOpen className="h-4 w-4" /> },
        { id: "articles", label: "Articles", icon: <FileText className="h-4 w-4" /> },
        { id: "texts", label: "Texts", icon: <BookOpen className="h-4 w-4" /> },
    ]

    return (
        <div className="w-full border-b border-border/40 mb-6">
            <div className="flex w-full items-center justify-start gap-6 overflow-x-auto px-4 md:px-0">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "group relative flex items-center gap-2 pb-3 pt-2 text-sm font-medium transition-colors hover:text-primary",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <span className={cn(
                                "flex items-center gap-2",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                            )}>
                                {tab.icon}
                                {tab.label}
                            </span>
                            
                            {/* Active Underline */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-md" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
