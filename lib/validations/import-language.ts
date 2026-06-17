import { z } from "zod"

// Schema for generic import format (e.g. third-party tools)
export const genericSchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    lexicon: z.array(z.object({
        word: z.string(),
        definition: z.string(),
        ipa: z.string().optional(),
        pos: z.string().optional(),
        etymology: z.string().optional(),
    }).passthrough())
}).passthrough()

// Schema for LingoCon's own export format.
// Note: array-valued JSON columns (tags, relatedWords) come back as `null` when
// empty, so every array field accepts null — otherwise re-importing the app's
// own export fails with "expected array, received null" (issue #23).
export const lingoconSchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    dictionaryEntries: z.array(z.object({
        lemma: z.string(),
        gloss: z.string(),
        ipa: z.string().nullable().optional(),
        partOfSpeech: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        etymology: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
    }).passthrough()).nullable().optional().default([]),
    scriptSymbols: z.array(z.object({
        symbol: z.string(),
        ipa: z.string().nullable().optional(),
        latin: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        order: z.number().nullable().optional(),
    }).passthrough()).nullable().optional().default([]),
}).passthrough()

export type ImportPayload =
    | { format: "lingocon"; data: z.infer<typeof lingoconSchema> }
    | { format: "generic"; data: z.infer<typeof genericSchema> }

/**
 * Validate raw import JSON against the LingoCon-native or generic schema.
 * The format is chosen by the shape of the file (a `dictionaryEntries` key marks
 * a LingoCon export), so the error message reflects the format the user actually
 * provided instead of mixing both schemas' complaints.
 */
export function parseImportPayload(raw: unknown): ImportPayload | { error: string } {
    const looksLikeLingocon =
        !!raw && typeof raw === "object" && "dictionaryEntries" in raw && !("lexicon" in raw)

    if (looksLikeLingocon) {
        const r = lingoconSchema.safeParse(raw)
        if (r.success) return { format: "lingocon", data: r.data }
        return { error: formatIssues(r.error) }
    }

    const r = genericSchema.safeParse(raw)
    if (r.success) return { format: "generic", data: r.data }
    return { error: formatIssues(r.error) }
}

function formatIssues(error: z.ZodError): string {
    const messages = error.issues.map(i => {
        const path = i.path.join(".")
        return path ? `${path}: ${i.message}` : i.message
    })
    return "Invalid JSON format: " + Array.from(new Set(messages)).join(", ")
}
