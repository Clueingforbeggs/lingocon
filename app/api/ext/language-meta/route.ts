import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractBearer, validateExtensionToken } from "@/lib/services/extension-token"

export const dynamic = "force-dynamic"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

/**
 * GET /api/ext/language-meta?languageId=X
 * Returns display metadata for a language: font, name, slug, script settings.
 */
export async function GET(request: NextRequest) {
  const raw = extractBearer(request.headers.get("Authorization"))
  const userId = raw ? await validateExtensionToken(raw) : null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const languageId = request.nextUrl.searchParams.get("languageId")
  if (!languageId) {
    return NextResponse.json({ error: "languageId is required" }, { status: 400 })
  }

  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: {
      id: true,
      name: true,
      slug: true,
      fontUrl: true,
      fontFamily: true,
      fontScale: true,
      allowsDiacritics: true,
      metadata: true,
      ownerId: true,
      collaborators: { where: { userId }, select: { userId: true } },
    },
  })

  if (!language) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (language.ownerId !== userId && language.collaborators.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { ownerId: _o, collaborators: _c, ...meta } = language
  return NextResponse.json(meta)
}
