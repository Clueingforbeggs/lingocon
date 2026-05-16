"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

interface PhonemeFrequencyChartProps {
  /**
   * IPA transcriptions from dictionary entries.
   * Each entry is a full IPA string, e.g. "/ˈba.na.na/" or "bana"
   */
  ipaList: (string | null)[]
  /**
   * The language's phoneme inventory (from script symbols IPA mappings)
   * so we only count known phonemes, not noise characters.
   */
  knownPhonemes?: string[]
}

/** Characters to strip when parsing IPA strings */
const IPA_STRIP_RE = /[/\[\]ˈˌ.{}|‖↗↘\s]/g

/** Diacritics that modify a preceding phoneme (not standalone phonemes) */
const IPA_DIACRITICS_RE = /^[ʰʷʲˤˠˁːˑ̈̃̈͡]$/

/**
 * Tokenise an IPA string into individual phoneme symbols.
 * Handles digraphs by greedily matching longer sequences first.
 */
function tokeniseIPA(ipa: string, phonemeSet?: Set<string>): string[] {
  const cleaned = ipa.replace(IPA_STRIP_RE, "")
  const tokens: string[] = []
  let i = 0
  while (i < cleaned.length) {
    // Try 2-char match first (digraphs like t͡ʃ, d͡ʒ)
    if (i + 1 < cleaned.length) {
      const two = cleaned.slice(i, i + 2)
      if (phonemeSet ? phonemeSet.has(two) : false) {
        tokens.push(two)
        i += 2
        continue
      }
    }
    const ch = cleaned[i]
    if (!IPA_DIACRITICS_RE.test(ch)) {
      tokens.push(ch)
    }
    i++
  }
  return tokens.filter(t => t.trim().length > 0)
}

export function PhonemeFrequencyChart({
  ipaList,
  knownPhonemes,
}: PhonemeFrequencyChartProps) {
  const phonemeSet = useMemo(
    () => (knownPhonemes ? new Set(knownPhonemes) : undefined),
    [knownPhonemes]
  )

  const { sorted, totalTokens } = useMemo(() => {
    const counts = new Map<string, number>()
    let total = 0

    for (const ipa of ipaList) {
      if (!ipa) continue
      const tokens = tokeniseIPA(ipa, phonemeSet)
      for (const t of tokens) {
        // If we have a known set, only count known phonemes
        if (phonemeSet && !phonemeSet.has(t)) continue
        counts.set(t, (counts.get(t) ?? 0) + 1)
        total++
      }
    }

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30) // top 30

    return { sorted, totalTokens: total }
  }, [ipaList, phonemeSet])

  if (sorted.length === 0) return null

  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Phoneme Frequency
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of phonemes across {ipaList.filter(Boolean).length} transcribed dictionary entries
          ({totalTokens.toLocaleString()} total tokens)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {sorted.map(([phoneme, count]) => {
            const pct = Math.round((count / totalTokens) * 100 * 10) / 10
            const barW = Math.round((count / maxCount) * 100)
            return (
              <div key={phoneme} className="flex items-center gap-3">
                <span className="font-mono text-sm w-8 shrink-0 text-right text-foreground">
                  /{phoneme}/
                </span>
                <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-primary/70 rounded transition-all"
                    style={{ width: `${barW}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 shrink-0">
                  {count.toLocaleString()} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
