import { describe, it, expect } from "vitest"
import {
  extractSoundChangeConfig,
  deriveForm,
  deriveOptionalForm,
} from "../derive-forms"

describe("extractSoundChangeConfig", () => {
  it("returns null when metadata is empty / missing rules", () => {
    expect(extractSoundChangeConfig(null)).toBeNull()
    expect(extractSoundChangeConfig({})).toBeNull()
    expect(extractSoundChangeConfig({ soundChangeRules: "   " })).toBeNull()
  })

  it("returns null when no rule parses", () => {
    expect(extractSoundChangeConfig({ soundChangeRules: "// just a comment" })).toBeNull()
  })

  it("parses rules from metadata", () => {
    const config = extractSoundChangeConfig({ soundChangeRules: "a > e\nk → tʃ / _i" })
    expect(config).not.toBeNull()
    expect(config!.rules).toHaveLength(2)
    expect(config!.vowels).toBeUndefined()
    expect(config!.consonants).toBeUndefined()
  })

  it("reads phonology overrides only when enabled and non-empty", () => {
    const enabled = extractSoundChangeConfig({
      soundChangeRules: "a > e",
      phonologyOverride: { enabled: true, vowels: ["a", "e"], consonants: ["k"] },
    })
    expect(enabled!.vowels).toEqual(new Set(["a", "e"]))
    expect(enabled!.consonants).toEqual(new Set(["k"]))

    const disabled = extractSoundChangeConfig({
      soundChangeRules: "a > e",
      phonologyOverride: { enabled: false, vowels: ["a"], consonants: ["k"] },
    })
    expect(disabled!.vowels).toBeUndefined()
    expect(disabled!.consonants).toBeUndefined()
  })
})

describe("deriveForm", () => {
  it("applies an unconditional change", () => {
    const config = extractSoundChangeConfig({ soundChangeRules: "a > e" })!
    expect(deriveForm("banana", config)).toBe("benene")
  })

  it("applies intervocalic deletion across adjacent environments", () => {
    const config = extractSoundChangeConfig({ soundChangeRules: "s → ∅ / V_V" })!
    expect(deriveForm("asasa", config)).toBe("aaa")
  })

  it("runs a multi-rule pipeline in order", () => {
    // "kaki" → (k→tʃ/_i) "katʃi" → (a→e) "ketʃi"
    const config = extractSoundChangeConfig({ soundChangeRules: "k → tʃ / _i\na > e" })!
    expect(deriveForm("kaki", config)).toBe("ketʃi")
  })
})

describe("deriveOptionalForm", () => {
  const config = extractSoundChangeConfig({ soundChangeRules: "a > e" })!

  it("preserves null/empty", () => {
    expect(deriveOptionalForm(null, config)).toBeNull()
    expect(deriveOptionalForm(undefined, config)).toBeNull()
    expect(deriveOptionalForm("", config)).toBeNull()
  })

  it("transforms a present form", () => {
    expect(deriveOptionalForm("aba", config)).toBe("ebe")
  })
})
