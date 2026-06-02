import { describe, expect, it } from "vitest"
import {
  buildVowelChartData,
  extractVowelInventory,
  extractVowelsFromSymbolIpa,
  vowelToChartPoint,
} from "../vowel-inventory"

describe("vowel-inventory", () => {
  it("extracts multi-character vowels from symbol IPA", () => {
    expect(extractVowelsFromSymbolIpa(["/a/", "e̞"])).toEqual(expect.arrayContaining(["a", "e̞"]))
  })

  it("prefers phonology override vowels", () => {
    const vowels = extractVowelInventory(
      [{ ipa: "k" }],
      { phonologyOverride: { enabled: true, vowels: ["i", "u"] } }
    )
    expect(vowels).toEqual(["i", "u"])
  })

  it("maps vowels to chart coordinates", () => {
    const front = vowelToChartPoint("i")
    const back = vowelToChartPoint("u")
    expect(front?.y).toBeLessThan(back?.y ?? 1)
    expect(front?.x).toBeLessThan(back?.x ?? 1)
    expect(front?.rounded).toBe(false)
    expect(back?.rounded).toBe(true)
  })

  it("reports unknown inventory symbols separately", () => {
    const { points, unknown } = buildVowelChartData(["a", "not-a-vowel"])
    expect(points.map((p) => p.ipa)).toEqual(["a"])
    expect(unknown).toEqual(["not-a-vowel"])
  })
})
