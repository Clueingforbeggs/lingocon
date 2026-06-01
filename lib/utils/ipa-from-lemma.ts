import { extractIPA } from "./ipa-detection"

interface SymbolWithIpa {
  symbol: string
  capitalSymbol?: string | null
  ipa?: string | null
}

/**
 * Build IPA for a lemma by mapping script symbols to their IPA values.
 * Uses longest-match first so digraphs (e.g. "ch") resolve correctly.
 */
export function suggestIpaFromLemma(lemma: string, symbols: SymbolWithIpa[]): string {
  if (!lemma || symbols.length === 0) return ""

  const ipaByScript = new Map<string, string>()
  for (const s of symbols) {
    if (!s.ipa) continue
    const ipa = extractIPA(s.ipa)
    if (!ipa) continue
    if (s.symbol) ipaByScript.set(s.symbol, ipa)
    if (s.capitalSymbol) ipaByScript.set(s.capitalSymbol, ipa)
  }

  if (ipaByScript.size === 0) return ""

  const scriptSymbols = Array.from(ipaByScript.keys()).sort((a, b) => b.length - a.length)
  let remaining = lemma.normalize("NFC")
  let result = ""

  while (remaining.length > 0) {
    let matched = false
    for (const script of scriptSymbols) {
      if (remaining.startsWith(script)) {
        result += ipaByScript.get(script)!
        remaining = remaining.slice(script.length)
        matched = true
        break
      }
    }
    if (matched) continue

    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
    const first = segmenter.segment(remaining)[Symbol.iterator]().next().value
    if (!first) break

    const char = first.segment
    result += char
    remaining = remaining.slice(char.length)
  }

  return result
}
