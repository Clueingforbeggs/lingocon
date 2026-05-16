import { prisma } from "@/lib/prisma"
import { getUserId, canViewLanguage } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { GrammarEditor } from "../grammar-editor"

async function getGrammarPage(languageSlug: string, pageSlug: string, userId: string | null) {
  const language = await prisma.language.findUnique({
    where: { slug: languageSlug },
    select: {
      id: true,
      ownerId: true,
      scriptSymbols: {
        orderBy: {
          order: "asc",
        },
      },
      grammarPages: {
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          imageUrl: true,
          order: true,
          paradigmId: true,
          languageId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!language) {
    return null
  }

  // Allow access if user can view (owner, collaborator, or public) - skip in dev mode
  if (process.env.DEV_MODE !== "true" && userId) {
    const canView = await canViewLanguage(language.id, userId)
    if (!canView) {
      return null
    }
  }

  const page = language.grammarPages.find(p => p.slug === pageSlug)
  if (!page) {
    return null
  }

  const otherPages = language.grammarPages
    .filter(p => p.slug !== pageSlug)
    .map(p => ({ id: p.id, title: p.title, slug: p.slug }))

  return { languageId: language.id, page, symbols: language.scriptSymbols, otherPages }
}

export default async function EditGrammarPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const userId = await getUserId()

  // In dev mode, allow access without auth
  if (!userId && process.env.DEV_MODE !== "true") {
    redirect("/login")
  }

  const { slug, pageSlug } = await params
  const result = await getGrammarPage(slug, pageSlug, userId)

  if (!result) {
    notFound()
  }

  const { languageId, page, symbols, otherPages } = result

  return (
    <GrammarEditor
      languageId={languageId}
      languageSlug={slug}
      page={page}
      symbols={symbols}
      grammarPages={otherPages}
    />
  )
}

