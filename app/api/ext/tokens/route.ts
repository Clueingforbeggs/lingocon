import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth-helpers"
import { listExtensionTokens } from "@/lib/services/extension-token"

export const dynamic = "force-dynamic"

/**
 * GET /api/ext/tokens
 * Session-authenticated. Returns active tokens for the current user (metadata only).
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await listExtensionTokens(userId)
  return NextResponse.json({ tokens })
}
