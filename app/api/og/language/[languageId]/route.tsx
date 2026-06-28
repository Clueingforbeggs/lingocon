import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

/**
 * Content-rich Open Graph card for a language hub: name, slug, and the core
 * "what's inside" stats (words, grammar, alphabet). Complements the
 * family-tree card, which is diachronics-focused.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ languageId: string }> },
) {
  const { languageId } = await params

  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: {
      name: true,
      slug: true,
      owner: { select: { name: true } },
      _count: {
        select: {
          dictionaryEntries: true,
          grammarPages: true,
          scriptSymbols: true,
          favorites: true,
        },
      },
    },
  })

  if (!language) {
    return new Response("Language not found", { status: 404 })
  }

  const initial = (language.name.trim()[0] || "?").toUpperCase()
  const stats: { value: number; label: string; color: string }[] = [
    { value: language._count.dictionaryEntries, label: "words", color: "#60a5fa" },
    { value: language._count.grammarPages, label: "grammar pages", color: "#a78bfa" },
    { value: language._count.scriptSymbols, label: "alphabet", color: "#34d399" },
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
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Initial tile + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "12px" }}>
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "56px",
              fontWeight: 800,
            }}
          >
            {initial}
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              letterSpacing: "-2px",
              background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            {language.name}
          </div>
        </div>

        <div style={{ fontSize: "20px", color: "rgba(148, 163, 184, 0.8)", marginBottom: "36px", display: "flex" }}>
          lingocon.com/lang/{language.slug}
        </div>

        {/* Stats row */}
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
                padding: "20px 36px",
              }}
            >
              <span style={{ fontSize: "40px", fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: "16px", color: "rgba(148, 163, 184, 0.8)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "32px",
            fontSize: "14px",
            color: "rgba(148, 163, 184, 0.5)",
            display: "flex",
          }}
        >
          by {language.owner.name || "Anonymous"} • LingoCon
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
