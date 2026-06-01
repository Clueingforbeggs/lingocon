import { describe, expect, it } from "vitest"
import { suggestIpaFromLemma } from "../ipa-from-lemma"

describe("suggestIpaFromLemma", () => {
  it("maps single characters to IPA", () => {
    const symbols = [
      { symbol: "a", ipa: "a" },
      { symbol: "k", ipa: "k" },
    ]
    expect(suggestIpaFromLemma("aka", symbols)).toBe("aka")
  })

  it("prefers longer script symbols (digraphs)", () => {
    const symbols = [
      { symbol: "c", ipa: "s" },
      { symbol: "ch", ipa: "tʃ" },
      { symbol: "a", ipa: "a" },
    ]
    expect(suggestIpaFromLemma("cha", symbols)).toBe("tʃa")
  })

  it("strips slashes from symbol IPA values", () => {
    const symbols = [{ symbol: "a", ipa: "/a/" }]
    expect(suggestIpaFromLemma("a", symbols)).toBe("a")
  })

  it("maps capital symbols", () => {
    const symbols = [
      { symbol: "a", ipa: "a" },
      { symbol: "A", capitalSymbol: "A", ipa: "a" },
    ]
    expect(suggestIpaFromLemma("A", symbols)).toBe("a")
  })

  it("returns empty when no IPA mappings exist", () => {
    expect(suggestIpaFromLemma("hello", [{ symbol: "h", ipa: null }])).toBe("")
  })
})
