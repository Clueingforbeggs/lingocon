"use client"

import { AnimatedCounter } from "@/components/landing/animated-counter"

interface HeroSocialProofProps {
    languageCount: number
    wordCount: number
    userCount: number
}

export function HeroSocialProof({ languageCount, wordCount, userCount }: HeroSocialProofProps) {
    const items = [
        { value: languageCount, label: "languages" },
        { value: wordCount, label: "words defined" },
        { value: userCount, label: "conlangers" },
    ]

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-7 text-sm text-muted-foreground">
            {items.map((item, i) => (
                <div key={item.label} className="flex items-center gap-4 sm:gap-7">
                    {i > 0 && <span className="hidden h-4 w-px bg-border/70 sm:block" aria-hidden />}
                    <span className="flex items-baseline gap-1.5">
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                            <AnimatedCounter target={item.value} />
                        </span>
                        <span>{item.label}</span>
                    </span>
                </div>
            ))}
        </div>
    )
}
