"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { LanguagePlaceholder } from "@/components/language-placeholder"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
import {
    buildFamilyGraph,
    resolveFamilies,
    AURORA_FAMILY_COLORS,
    type FamilyLanguageData,
} from "@/lib/utils/family-graph-core"
import type { LanguageData } from "@/components/landing/universe-map"

// The force-graph is memory-heavy and crashes mobile browsers, so it is only
// ever imported (and thus downloaded) on desktop viewports.
const LingoConUniverseMap = dynamic(
    () => import("@/components/landing/universe-map").then((m) => m.LingoConUniverseMap),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        ),
    }
)

interface FamilyGroup {
    key: string
    label: string
    color: string
    languages: LanguageData[]
}

function MobileFamilyList({ languages }: { languages: LanguageData[] }) {
    const groups = useMemo<FamilyGroup[]>(() => {
        const input: FamilyLanguageData[] = languages.map((l) => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            parentLanguageId: l.parentLanguageId,
            externalAncestry: l.externalAncestry ?? null,
            familyId: l.familyId ?? null,
            family: l.family ?? null,
            _count: l._count,
        }))
        const resolved = resolveFamilies(buildFamilyGraph(input))

        const byKey = new Map<string, FamilyGroup>()
        for (const lang of languages) {
            const fam = resolved.get(lang.id)
            const key = fam?.key ?? lang.id
            const label = fam?.label ?? lang.name
            const color = fam?.color ?? AURORA_FAMILY_COLORS[0]
            if (!byKey.has(key)) byKey.set(key, { key, label, color, languages: [] })
            byKey.get(key)!.languages.push(lang)
        }

        return Array.from(byKey.values())
            .map((g) => ({
                ...g,
                languages: g.languages.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => b.languages.length - a.languages.length || a.label.localeCompare(b.label))
    }, [languages])

    return (
        <div className="h-full overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-2xl px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Language <span className="aurora-gradient-text">Families</span>
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {languages.length} public {languages.length === 1 ? "language" : "languages"} across{" "}
                        {groups.length} {groups.length === 1 ? "family" : "families"}. The full interactive map
                        is available on a larger screen.
                    </p>
                </div>

                <div className="space-y-7">
                    {groups.map((group) => (
                        <section key={group.key}>
                            <div className="mb-2.5 flex items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ background: group.color }}
                                />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90">
                                    {group.label}
                                </h2>
                                <span className="text-xs text-muted-foreground">
                                    {group.languages.length}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {group.languages.map((lang) => (
                                    <li key={lang.id}>
                                        <Link
                                            href={`/lang/${lang.slug}`}
                                            className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 px-3 py-2.5 active:scale-[0.99] transition-transform"
                                        >
                                            <LanguagePlaceholder
                                                name={lang.name}
                                                flagUrl={lang.flagUrl}
                                                size="sm"
                                                variant="flag"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-semibold">{lang.name}</div>
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {lang._count.dictionaryEntries.toLocaleString()} words
                                                    {lang.owner?.name ? ` · by ${lang.owner.name}` : ""}
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function FamiliesView({ languages }: { languages: LanguageData[] }) {
    const isMobile = useIsMobile()

    // Until detected (undefined) or on mobile, render the lightweight list so the
    // crash-prone canvas graph never mounts on phones.
    if (isMobile !== false) {
        return <MobileFamilyList languages={languages} />
    }

    return (
        <div className="h-full w-full">
            <LingoConUniverseMap languages={languages} />
        </div>
    )
}
