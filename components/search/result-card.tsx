"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, FileText, Globe, Hash } from "lucide-react"
import { LanguagePlaceholder } from "@/components/language-placeholder"

interface BaseResult {
    id: string
}

interface LanguageResult extends BaseResult {
    type: "language"
    name: string
    slug: string
    description: string | null
    flagUrl: string | null
    owner: { name: string | null; image: string | null }
    _count: {
        scriptSymbols: number
        grammarPages: number
        dictionaryEntries: number
    }
}

interface DictionaryResult extends BaseResult {
    type: "entry"
    lemma: string
    gloss: string
    ipa: string | null
    language: { id: string; name: string; slug: string; fontFamily: string | null }
}

interface GrammarResult extends BaseResult {
    type: "grammar"
    title: string
    slug: string
    language: { id: string; name: string; slug: string; fontFamily: string | null }
}

interface ArticleResult extends BaseResult {
    type: "article"
    title: string
    slug: string
    excerpt: string | null
    language: { id: string; name: string; slug: string }
}

interface TextResult extends BaseResult {
    type: "text"
    title: string
    slug: string
    description: string | null
    language: { id: string; name: string; slug: string }
}

type SearchResultItem = LanguageResult | DictionaryResult | GrammarResult | ArticleResult | TextResult

interface ResultCardProps {
    result: SearchResultItem
}

export function ResultCard({ result }: ResultCardProps) {
    if (result.type === "language") {
        return (
            <div className="group flex flex-col gap-1 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Globe className="h-4 w-4" />
                    <span>lingocon.com &gt; lang &gt; {result.slug}</span>
                </div>
                <Link href={`/lang/${result.slug}`} className="group-hover:underline">
                    <h3 className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        {result.name}
                        {result.flagUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={result.flagUrl} alt={`${result.name} flag`} className="h-4 w-6 rounded-sm object-cover ml-2" />
                        )}
                    </h3>
                </Link>
                <p className="text-sm text-foreground mt-1 line-clamp-2">
                    {result.description || `Explore the ${result.name} constructed language created by ${result.owner.name || "Unknown"}.`}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{result._count.dictionaryEntries} dictionary entries</span>
                    <span>•</span>
                    <span>{result._count.grammarPages} grammar pages</span>
                </div>
            </div>
        )
    }

    if (result.type === "entry") {
        return (
            <div className="group flex flex-col gap-1 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>lingocon.com &gt; lang &gt; {result.language.slug} &gt; dictionary</span>
                </div>
                <Link href={`/lang/${result.language.slug}/dictionary?q=${encodeURIComponent(result.lemma)}`} className="group-hover:underline">
                    <h3 className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <span style={result.language.fontFamily ? { fontFamily: result.language.fontFamily } : undefined}>
                            {result.lemma}
                        </span>
                        {result.ipa && <span className="text-muted-foreground text-base font-normal">/{result.ipa}/</span>}
                        <span className="text-xs font-normal px-2 py-0.5 bg-muted rounded-full ml-2 text-foreground">Dictionary</span>
                    </h3>
                </Link>
                <p className="text-sm text-foreground mt-1 line-clamp-2">
                    <span className="font-medium text-muted-foreground mr-2">{result.language.name}</span>
                    {result.gloss}
                </p>
            </div>
        )
    }

    if (result.type === "grammar") {
        return (
            <div className="group flex flex-col gap-1 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>lingocon.com &gt; lang &gt; {result.language.slug} &gt; grammar</span>
                </div>
                <Link href={`/lang/${result.language.slug}/grammar/${result.slug}`} className="group-hover:underline">
                    <h3 className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        {result.title}
                        <span className="text-xs font-normal px-2 py-0.5 bg-muted rounded-full ml-2 text-foreground">Grammar</span>
                    </h3>
                </Link>
                <p className="text-sm text-foreground mt-1 line-clamp-2">
                    <span className="font-medium text-muted-foreground mr-2">{result.language.name}</span>
                    Read grammar documentation for {result.title}.
                </p>
            </div>
        )
    }

    if (result.type === "article") {
        return (
            <div className="group flex flex-col gap-1 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>lingocon.com &gt; lang &gt; {result.language.slug} &gt; articles</span>
                </div>
                <Link href={`/lang/${result.language.slug}/articles/${result.slug}`} className="group-hover:underline">
                    <h3 className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        {result.title}
                        <span className="text-xs font-normal px-2 py-0.5 bg-muted rounded-full ml-2 text-foreground">Article</span>
                    </h3>
                </Link>
                <p className="text-sm text-foreground mt-1 line-clamp-2">
                    <span className="font-medium text-muted-foreground mr-2">{result.language.name}</span>
                    {result.excerpt || "Read full article."}
                </p>
            </div>
        )
    }

    if (result.type === "text") {
        return (
            <div className="group flex flex-col gap-1 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>lingocon.com &gt; lang &gt; {result.language.slug} &gt; texts</span>
                </div>
                <Link href={`/lang/${result.language.slug}/texts/${result.slug}`} className="group-hover:underline">
                    <h3 className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        {result.title}
                        <span className="text-xs font-normal px-2 py-0.5 bg-muted rounded-full ml-2 text-foreground">Text</span>
                    </h3>
                </Link>
                <p className="text-sm text-foreground mt-1 line-clamp-2">
                    <span className="font-medium text-muted-foreground mr-2">{result.language.name}</span>
                    {result.description || "Read translated text."}
                </p>
            </div>
        )
    }

    return null
}
