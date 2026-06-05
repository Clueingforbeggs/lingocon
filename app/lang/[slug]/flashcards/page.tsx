import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FlashcardSession } from "@/app/studio/lang/[slug]/flashcards/flashcard-session"
import { getLanguageSeoData } from "@/lib/seo-data"
import { buildLanguageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const language = await getLanguageSeoData(slug)
  if (!language) return { title: "Quick Practice", robots: { index: false, follow: false } }

  return buildLanguageMetadata(language, {
    section: "flashcards",
    title: `${language.name} — Quick Practice (Flashcards & Quizzes)`,
    description: `Practice ${language.name} vocabulary with quick flashcard and quiz sessions on LingoCon. For spaced-repetition review and progress tracking, enroll in the language.`,
    keywords: [`${language.name} flashcards`, `learn ${language.name}`, `${language.name} vocabulary practice`],
  })
}

export default async function PublicFlashcardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const language = await prisma.language.findUnique({
    where: { slug, visibility: "PUBLIC" },
    select: {
      id: true,
      name: true,
      slug: true,
      dictionaryEntries: {
        select: {
          id: true,
          lemma: true,
          gloss: true,
          ipa: true,
          partOfSpeech: true,
        },
      },
    },
  })

  if (!language) notFound()

  return (
    <FlashcardSession
      entries={language.dictionaryEntries}
      languageName={language.name}
      languageSlug={language.slug}
      isPublic
    />
  )
}
