import { describe, it, expect } from "vitest"
import { getBaseIpa, getPhonemeKind, buildConsonantChart } from "@/lib/data/ipa-data"

describe("getBaseIpa", () => {
    it("returns plain letters unchanged", () => {
        expect(getBaseIpa("t")).toBe("t")
        expect(getBaseIpa("a")).toBe("a")
        expect(getBaseIpa("ɑ")).toBe("ɑ")
    })

    it("strips combining-mark diacritics (U+0300–U+036F)", () => {
        expect(getBaseIpa("ɑ̃")).toBe("ɑ") // nasalized
        expect(getBaseIpa("n̥")).toBe("n") // voiceless (ring below)
    })

    it("strips spacing modifier-letter diacritics (U+02B0–U+02FF)", () => {
        expect(getBaseIpa("tʰ")).toBe("t") // aspirated
        expect(getBaseIpa("kʷ")).toBe("k") // labialized
        expect(getBaseIpa("tʲ")).toBe("t") // palatalized
        expect(getBaseIpa("dˤ")).toBe("d") // pharyngealized
        expect(getBaseIpa("pʼ")).toBe("p") // ejective
    })

    it("strips length marks", () => {
        expect(getBaseIpa("aː")).toBe("a") // long
        expect(getBaseIpa("eˑ")).toBe("e") // half-long
    })

    it("strips affricate tie bars", () => {
        expect(getBaseIpa("t͡s")).toBe("ts")
        expect(getBaseIpa("d͡ʒ")).toBe("dʒ")
    })
})

describe("getPhonemeKind", () => {
    it("classifies plain consonants and vowels", () => {
        expect(getPhonemeKind("t")).toBe("consonant")
        expect(getPhonemeKind("a")).toBe("vowel")
    })

    it("classifies modifier-letter diacritic consonants (regression: was 'unrecognized')", () => {
        expect(getPhonemeKind("tʰ")).toBe("consonant")
        expect(getPhonemeKind("kʷ")).toBe("consonant")
        expect(getPhonemeKind("tʲ")).toBe("consonant")
        expect(getPhonemeKind("pʼ")).toBe("consonant")
    })

    it("classifies diacritic vowels", () => {
        expect(getPhonemeKind("ɑ̃")).toBe("vowel") // nasalized (combining mark)
        expect(getPhonemeKind("aː")).toBe("vowel") // long (modifier letter)
    })

    it("classifies affricates written with a tie bar", () => {
        expect(getPhonemeKind("t͡s")).toBe("consonant")
        expect(getPhonemeKind("d͡ʒ")).toBe("consonant")
    })

    it("classifies precomposed and diacriticized map keys directly", () => {
        expect(getPhonemeKind("ç")).toBe("consonant") // precomposed
        expect(getPhonemeKind("e̞")).toBe("vowel") // mid vowel key uses a combining mark
    })

    it("returns null for genuinely non-IPA input", () => {
        expect(getPhonemeKind("€")).toBeNull()
        expect(getPhonemeKind("5")).toBeNull()
    })
})

describe("buildConsonantChart", () => {
    it("keeps a plain phoneme and its diacritic variant in the same cell", () => {
        const { chart } = buildConsonantChart(["t", "tʰ"])
        // both share Alveolar Plosive voiceless — neither should overwrite the other
        expect(chart["Plosive"]["Alveolar"].voiceless).toEqual(["t", "tʰ"])
        expect(chart["Plosive"]["Alveolar"].voiced).toEqual([])
    })

    it("separates voiced and voiceless variants within a cell", () => {
        const { chart } = buildConsonantChart(["t", "d", "dʲ"])
        expect(chart["Plosive"]["Alveolar"].voiceless).toEqual(["t"])
        expect(chart["Plosive"]["Alveolar"].voiced).toEqual(["d", "dʲ"])
    })

    it("sorts each cell with the base letter before longer variants", () => {
        const { chart } = buildConsonantChart(["tʰ", "t", "tʷ"])
        expect(chart["Plosive"]["Alveolar"].voiceless).toEqual(["t", "tʰ", "tʷ"])
    })

    it("deduplicates repeated symbols", () => {
        const { chart } = buildConsonantChart(["k", "k"])
        expect(chart["Plosive"]["Velar"].voiceless).toEqual(["k"])
    })

    it("only lists used places and manners, skipping vowels and unknowns", () => {
        const { places, manners } = buildConsonantChart(["t", "a", "€"])
        expect(manners).toEqual(["Plosive"])
        expect(places).toEqual(["Alveolar"])
    })
})
