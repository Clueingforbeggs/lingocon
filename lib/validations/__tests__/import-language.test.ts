import { describe, it, expect } from "vitest"
import { parseImportPayload } from "../import-language"

describe("parseImportPayload", () => {
  it("accepts a LingoCon export with null array columns (issue #23)", () => {
    // Shape produced by the JSON export: empty tags/relatedWords come back as null.
    const exported = {
      name: "Askathal",
      description: null,
      slug: "askathal",
      dictionaryEntries: [
        {
          lemma: "kar", gloss: "cat",
          ipa: null, partOfSpeech: null, notes: null, etymology: null,
          tags: null, relatedWords: null, sourceEntryId: null,
        },
      ],
      scriptSymbols: [{ symbol: "x", ipa: null, latin: null, name: null, order: 0 }],
      paradigms: [],
      owner: { id: "u1", name: "Alex", image: null },
    }

    const result = parseImportPayload(exported)
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.format).toBe("lingocon")
    expect(result.data.dictionaryEntries?.[0]?.lemma).toBe("kar")
  })

  it("accepts a LingoCon export with no dictionary entries", () => {
    const result = parseImportPayload({ name: "Empty", dictionaryEntries: [] })
    expect("error" in result).toBe(false)
  })

  it("accepts a generic third-party file with a lexicon", () => {
    const result = parseImportPayload({
      name: "Other",
      lexicon: [{ word: "ka", definition: "dog" }],
    })
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.format).toBe("generic")
  })

  it("reports a clear, deduped error for an invalid file", () => {
    const result = parseImportPayload({ name: 123 }) // name must be a string, no lexicon
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).toMatch(/Invalid JSON format/)
  })

  it("does not surface the wrong schema's error for a LingoCon file", () => {
    // A LingoCon file with a genuinely bad field must NOT mention `lexicon`.
    const result = parseImportPayload({ name: 5, dictionaryEntries: [] })
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).not.toMatch(/lexicon/)
  })
})
