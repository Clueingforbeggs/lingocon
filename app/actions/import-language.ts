"use server"

import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth-helpers"
import { createActivity } from "@/lib/utils/activity"
import { parseImportPayload } from "@/lib/validations/import-language"

export async function importLanguage(jsonContent: string) {
    const userId = await getUserId()

    if (!userId) {
        return {
            error: "Unauthorized",
        }
    }

    try {
        const rawData = JSON.parse(jsonContent)

        const parsed = parseImportPayload(rawData)
        if ("error" in parsed) {
            return { error: parsed.error }
        }

        const isLingocon = parsed.format === "lingocon"
        const validData = parsed.data

        // Generate a unique slug
        let slug = validData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        let suffix = 1
        const originalSlug = slug
        
        // Create the language with retry loop for slug collisions
        let language = null
        while (!language) {
            try {
                language = await prisma.language.create({
                    data: {
                        name: validData.name,
                        slug: slug,
                        description: validData.description || `Imported from ${validData.name} JSON`,
                        ownerId: userId,
                        visibility: "PRIVATE",
                    },
                })
            } catch (error: unknown) {
                const prismaError = error as { code?: string }
                if (prismaError.code === 'P2002') {
                    slug = `${originalSlug}-${suffix}`
                    suffix++
                } else {
                    throw error
                }
            }
        }

        // Normalize entries from either format
        let entriesToCreate: {
            languageId: string
            lemma: string
            gloss: string
            ipa: string | null
            partOfSpeech: string | null
            etymology: string | null
            notes: string | null
        }[]

        if (parsed.format === "lingocon") {
            const data = parsed.data
            entriesToCreate = (data.dictionaryEntries ?? [])
                .filter(entry => entry.lemma && entry.gloss)
                .map(entry => ({
                    languageId: language.id,
                    lemma: entry.lemma,
                    gloss: entry.gloss,
                    ipa: entry.ipa ?? null,
                    partOfSpeech: entry.partOfSpeech ?? null,
                    etymology: entry.etymology ?? null,
                    notes: entry.notes ?? null,
                }))
        } else {
            const data = parsed.data
            entriesToCreate = data.lexicon
                .filter(entry => entry.word && entry.definition)
                .map(entry => ({
                    languageId: language.id,
                    lemma: entry.word,
                    gloss: entry.definition,
                    ipa: entry.ipa ?? null,
                    partOfSpeech: entry.pos ?? null,
                    etymology: entry.etymology ?? null,
                    notes: null,
                }))
        }

        // Use createMany for performance
        if (entriesToCreate.length > 0) {
            await prisma.dictionaryEntry.createMany({
                data: entriesToCreate,
            })
        }

        // Import script symbols from LingoCon format
        if (parsed.format === "lingocon" && (parsed.data.scriptSymbols ?? []).length > 0) {
            await prisma.scriptSymbol.createMany({
                data: (parsed.data.scriptSymbols ?? []).map((s, i) => ({
                    languageId: language.id,
                    symbol: s.symbol,
                    ipa: s.ipa ?? null,
                    latin: s.latin ?? null,
                    name: s.name ?? null,
                    order: s.order ?? i,
                })),
            })
        }

        // Log activity
        await createActivity({
            type: "CREATED",
            entityType: "LANGUAGE",
            entityId: language.id,
            languageId: language.id,
            userId,
            description: `Imported language "${language.name}" with ${entriesToCreate.length} entries`,
            metadata: { source: "json_import", entryCount: entriesToCreate.length },
        })

        return {
            success: true,
            data: language,
            count: entriesToCreate.length
        }

    } catch (error) {
        if (error instanceof SyntaxError) {
            return {
                error: "Invalid JSON file"
            }
        }
        return {
            error: "Failed to import language: " + (error instanceof Error ? error.message : "Unknown error")
        }
    }
}
