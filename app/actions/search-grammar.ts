"use server"

import { prisma } from "@/lib/prisma"
import { documentToPlainText } from "@/lib/utils/tiptap-text"

export interface GrammarSearchResult {
    id: string
    title: string
    slug: string
    excerpt: string
}

/**
 * Search grammar pages of a public language by full-text match.
 * Falls back to title-only match when content is empty.
 */
export async function searchGrammarPages(
    languageSlug: string,
    query: string
): Promise<GrammarSearchResult[]> {
    if (!query.trim()) return []

    const language = await prisma.language.findUnique({
        where: { slug: languageSlug },
        select: { id: true, visibility: true },
    })

    if (!language || language.visibility === "PRIVATE") return []

    const pages = await prisma.grammarPage.findMany({
        where: { languageId: language.id },
        select: { id: true, title: true, slug: true, content: true },
        orderBy: { order: "asc" },
    })

    const q = query.toLowerCase()
    const results: GrammarSearchResult[] = []

    for (const page of pages) {
        const titleMatch = page.title.toLowerCase().includes(q)
        const plainText = documentToPlainText(page.content)
        const bodyMatch = plainText.toLowerCase().includes(q)

        if (!titleMatch && !bodyMatch) continue

        // Build a snippet around the first match in the body
        let excerpt = ""
        if (bodyMatch) {
            const idx = plainText.toLowerCase().indexOf(q)
            const start = Math.max(0, idx - 60)
            const end = Math.min(plainText.length, idx + q.length + 80)
            const raw = plainText.slice(start, end).trim()
            excerpt = (start > 0 ? "…" : "") + raw + (end < plainText.length ? "…" : "")
        }

        results.push({ id: page.id, title: page.title, slug: page.slug, excerpt })
    }

    return results
}
