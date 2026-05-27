"use client"

import { Input } from "@/components/ui/input"
import { Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SearchHeroProps {
    value: string
    onChange: (value: string) => void
    compact?: boolean
}

export function SearchHero({ value, onChange, compact }: SearchHeroProps) {
    const router = useRouter()

    if (compact) {
        return (
            <div className="flex w-full items-center gap-4 py-6 px-4 md:px-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <div className="relative w-full max-w-2xl">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Search className="h-5 w-5" />
                    </div>
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search LingoCon..."
                        className="h-12 w-full rounded-full border border-border/50 bg-background pl-12 pr-4 shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 dark:bg-muted/10"
                    />
                    {value && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <kbd className="hidden rounded border border-border/50 bg-muted/20 px-2 py-1 font-mono text-xs text-muted-foreground md:inline-flex">
                                ESC
                            </kbd>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="relative mb-8 flex w-full flex-col items-center justify-center text-center py-20">
            <div className="absolute left-0 top-0 mt-4 ml-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
            </div>

            <div className="mb-8 space-y-2">
                <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl lg:text-7xl">
                    LingoCon
                </h1>
                <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
                    Search across thousands of constructed languages, dictionary entries, and community grammars.
                </p>
            </div>

            <div className="relative w-full max-w-2xl transform transition-all duration-200 focus-within:scale-[1.02]">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <Search className="h-6 w-6" />
                </div>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search LingoCon or type a URL"
                    className="h-14 w-full rounded-full border-2 border-primary/10 bg-background/50 pl-14 text-lg shadow-lg backdrop-blur-xl transition-all placeholder:text-muted-foreground/40 hover:bg-background/80 hover:shadow-md focus:border-primary/20 focus:bg-background focus:ring-4 focus:ring-primary/5 dark:bg-muted/10"
                />
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-4">
                <Button variant="secondary" className="px-6 rounded-md text-sm">
                    LingoCon Search
                </Button>
                <Button variant="secondary" className="px-6 rounded-md text-sm">
                    I&apos;m Feeling Lucky
                </Button>
            </div>
        </div>
    )
}
