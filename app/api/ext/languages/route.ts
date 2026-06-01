import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractBearer, validateExtensionToken } from "@/lib/services/extension-token"

export const dynamic = "force-dynamic"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

/**
 * GET /api/ext/languages
 * Returns all languages the token owner owns or collaborates on.
 */
export async function GET(request: NextRequest) {
  const raw = extractBearer(request.headers.get("Authorization"))
  const userId = raw ? await validateExtensionToken(raw) : null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [owned, collaborated] = await Promise.all([
    prisma.language.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        slug: true,
        fontFamily: true,
        fontUrl: true,
        fontScale: true,
        _count: { select: { dictionaryEntries: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.languageCollaborator.findMany({
      where: { userId },
      select: {
        language: {
          select: {
            id: true,
            name: true,
            slug: true,
            fontFamily: true,
            fontUrl: true,
            fontScale: true,
            _count: { select: { dictionaryEntries: true } },
          },
        },
      },
    }),
  ])

  const collaboratedLanguages = collaborated.map((c) => c.language)

  // Deduplicate by id (owner could also be a collaborator record)
  const seen = new Set<string>()
  const languages = [...owned, ...collaboratedLanguages]
    .filter((l) => {
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })
    .map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      fontFamily: l.fontFamily,
      fontUrl: l.fontUrl,
      fontScale: l.fontScale,
      entryCount: l._count.dictionaryEntries,
    }))

  return NextResponse.json({ languages })
}
