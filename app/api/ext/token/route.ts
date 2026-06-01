import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth-helpers"
import {
  issueExtensionToken,
  revokeAllExtensionTokens,
  revokeExtensionTokenById,
  extractBearer,
  validateExtensionToken,
} from "@/lib/services/extension-token"

export const dynamic = "force-dynamic"

// OPTIONS — preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

/**
 * POST /api/ext/token
 * Session-authenticated. Issues a new extension token.
 * Body (optional): { name?: string }
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let name: string | undefined
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.name === "string") name = body.name.slice(0, 100)
  } catch {
    // body is optional
  }

  const { rawToken, expiresAt } = await issueExtensionToken(userId, name)

  return NextResponse.json({ token: rawToken, expiresAt })
}

/**
 * DELETE /api/ext/token
 * Revokes tokens.
 * - If body contains { id } and user is session-authenticated: revoke that specific token.
 * - If bearer token present: revoke all tokens for that user.
 * - If session present with no id: revoke all tokens for session user.
 */
export async function DELETE(request: NextRequest) {
  // Try session auth first
  const sessionUserId = await getUserId()

  // Try bearer auth
  const raw = extractBearer(request.headers.get("Authorization"))
  const bearerUserId = raw ? await validateExtensionToken(raw) : null

  const userId = sessionUserId ?? bearerUserId
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  if (typeof body.id === "string") {
    await revokeExtensionTokenById(body.id, userId)
    return NextResponse.json({ success: true })
  }

  await revokeAllExtensionTokens(userId)
  return NextResponse.json({ success: true })
}
