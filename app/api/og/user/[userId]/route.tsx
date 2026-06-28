import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

/** Content-rich Open Graph card for a creator profile. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  const [user, languages, words, followers, badges] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.language.count({ where: { ownerId: userId, visibility: "PUBLIC" } }),
    prisma.dictionaryEntry.count({ where: { language: { ownerId: userId, visibility: "PUBLIC" } } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.userBadge.count({ where: { userId, earnedAt: { not: null } } }),
  ])

  if (!user) {
    return new Response("User not found", { status: 404 })
  }

  const name = user.name || "Conlang creator"
  const initial = (name.trim()[0] || "?").toUpperCase()
  const stats: { value: number; label: string; color: string }[] = [
    { value: languages, label: "languages", color: "#60a5fa" },
    { value: words, label: "words", color: "#a78bfa" },
    { value: followers, label: "followers", color: "#34d399" },
    { value: badges, label: "badges", color: "#fbbf24" },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Avatar initial */}
        <div
          style={{
            width: "128px",
            height: "128px",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "64px",
            fontWeight: 800,
            marginBottom: "24px",
          }}
        >
          {initial}
        </div>

        <div
          style={{
            fontSize: "60px",
            fontWeight: 700,
            letterSpacing: "-2px",
            background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: "22px", color: "rgba(148, 163, 184, 0.8)", marginBottom: "36px", marginTop: "6px", display: "flex" }}>
          Conlang creator on LingoCon
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "18px 32px",
              }}
            >
              <span style={{ fontSize: "38px", fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: "15px", color: "rgba(148, 163, 184, 0.8)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
