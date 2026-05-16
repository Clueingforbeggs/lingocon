"use server"

import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { parseRules, applyPipeline } from "@/lib/utils/sound-change"
import { createActivity } from "@/lib/utils/activity"

export type ApplySoundChangesResult = {
  success: true
  applied: number
  unchanged: number
} | {
  error: string
}

/**
 * Apply the language's saved sound change rules to every dictionary entry,
 * updating the lemma (and IPA if present) in place.
 *
 * Only the owner or an EDITOR collaborator may call this.
 * The operation is transactional — either all updates succeed or none do.
 */
export async function applySoundChangesToDictionary(
  languageId: string
): Promise<ApplySoundChangesResult> {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  // Verify ownership / editor access
  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: {
      id: true,
      slug: true,
      name: true,
      ownerId: true,
      metadata: true,
      collaborators: {
        where: { userId, role: { in: ["OWNER", "EDITOR"] } },
        select: { role: true },
      },
    },
  })

  if (!language) return { error: "Language not found" }
  const isOwner = language.ownerId === userId
  const isEditor = language.collaborators.length > 0
  if (!isOwner && !isEditor) return { error: "Unauthorized" }

  // Extract saved rules from metadata
  const metadata = (language.metadata as Record<string, any>) ?? {}
  const rulesText: string = metadata.soundChangeRules ?? ""
  if (!rulesText.trim()) return { error: "No saved sound change rules found. Save your rules first." }

  const rules = parseRules(rulesText)
  if (rules.length === 0) return { error: "No valid rules could be parsed from the saved rules." }

  // Extract phonology overrides if set
  const phonologyOverride = metadata.phonologyOverride as
    | { enabled: boolean; consonants: string[]; vowels: string[] }
    | undefined

  const vowels =
    phonologyOverride?.enabled && phonologyOverride.vowels?.length
      ? new Set(phonologyOverride.vowels)
      : undefined

  const consonants =
    phonologyOverride?.enabled && phonologyOverride.consonants?.length
      ? new Set(phonologyOverride.consonants)
      : undefined

  // Fetch all entries
  const entries = await prisma.dictionaryEntry.findMany({
    where: { languageId },
    select: { id: true, lemma: true, ipa: true },
  })

  // Compute which entries actually change
  const updates: { id: string; lemma: string }[] = []

  for (const entry of entries) {
    const result = applyPipeline(entry.lemma, rules, vowels, consonants)
    if (result.changed !== result.original) {
      updates.push({ id: entry.id, lemma: result.changed })
    }
  }

  if (updates.length === 0) {
    return { success: true, applied: 0, unchanged: entries.length }
  }

  // Apply all updates in a transaction
  await prisma.$transaction(
    updates.map(u =>
      prisma.dictionaryEntry.update({
        where: { id: u.id },
        data: { lemma: u.lemma },
      })
    )
  )

  await createActivity({
    type: "UPDATED",
    entityType: "DICTIONARY_ENTRY",
    entityId: languageId,
    languageId,
    userId,
    description: `Applied sound change rules to ${updates.length} dictionary entries`,
    metadata: { ruleCount: rules.length, updatedCount: updates.length },
  })

  revalidatePath(`/studio/lang/${language.slug}/dictionary`)
  revalidatePath(`/lang/${language.slug}/dictionary`)

  return {
    success: true,
    applied: updates.length,
    unchanged: entries.length - updates.length,
  }
}
