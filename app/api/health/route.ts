import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Liveness + readiness probe for PM2 / nginx / uptime monitors.
 *
 * Returns 200 with `{ status: "ok" }` only when the process is up AND the
 * database is reachable; 503 otherwise. Keep this cheap — it may be polled
 * frequently. Never require auth and never cache.
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const startedAt = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      db: "up",
      uptimeSeconds: Math.round(process.uptime()),
      dbLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        db: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
