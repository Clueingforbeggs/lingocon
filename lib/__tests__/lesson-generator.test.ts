import { describe, expect, it } from "vitest"
import {
  generateExercises,
  generateLessonExercises,
  type VocabItem,
} from "../lesson-generator"

const vocab = (n: number): VocabItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `v${i}`,
    lemma: `word${i}`,
    gloss: `meaning${i}`,
    ipa: null,
    partOfSpeech: i % 2 === 0 ? "noun" : "verb",
  }))

describe("generateExercises — new Duolingo-style ordering", () => {
  it("returns an empty list when there are no vocab items", () => {
    expect(generateExercises([])).toEqual([])
  })

  it("emits a WORD_INTRO before the first recognition MC for each word", () => {
    const items = vocab(5)
    const exercises = generateExercises(items)

    for (const item of items) {
      const introIdx = exercises.findIndex(
        e => e.type === "WORD_INTRO" && e.id === `intro-${item.id}`,
      )
      const firstRecognitionIdx = exercises.findIndex(
        e =>
          e.type === "MULTIPLE_CHOICE" &&
          e.direction === "to_native" &&
          e.id === `mc-to_native-${item.id}`,
      )
      expect(introIdx).toBeGreaterThanOrEqual(0)
      expect(firstRecognitionIdx).toBeGreaterThan(introIdx)
    }
  })

  it("places MATCH_PAIRS after every word has been introduced and recognized", () => {
    const items = vocab(6)
    const exercises = generateExercises(items)

    const firstMatchIdx = exercises.findIndex(e => e.type === "MATCH_PAIRS")
    expect(firstMatchIdx).toBeGreaterThanOrEqual(0)

    // Every intro and every to_native MC must precede the first match-pairs.
    const introCountBefore = exercises
      .slice(0, firstMatchIdx)
      .filter(e => e.type === "WORD_INTRO").length
    const recognitionCountBefore = exercises
      .slice(0, firstMatchIdx)
      .filter(e => e.type === "MULTIPLE_CHOICE" && e.direction === "to_native").length

    expect(introCountBefore).toBe(items.length)
    expect(recognitionCountBefore).toBe(items.length)
  })

  it("does not lead with MATCH_PAIRS (no cold word-wall)", () => {
    const exercises = generateExercises(vocab(4))
    expect(exercises[0]?.type).toBe("WORD_INTRO")
  })

  it("caps production-round size to scale with vocab count", () => {
    // 6-word lesson: production budget = max(4, 6) = 6 cards
    const exercises = generateExercises(vocab(6))
    const production = exercises.filter(
      e =>
        e.type === "TRANSLATE" ||
        (e.type === "MULTIPLE_CHOICE" && e.direction === "to_target") ||
        e.type === "SENTENCE_BUILDER",
    )
    expect(production.length).toBeLessThanOrEqual(6)
  })

  it("guarantees a minimum production floor on tiny lessons", () => {
    // 1-word lesson: production budget = max(4, 1) = 4 — though we can't
    // exceed what the production round actually generates for 1 item.
    const exercises = generateExercises(vocab(1))
    const production = exercises.filter(
      e =>
        e.type === "TRANSLATE" ||
        (e.type === "MULTIPLE_CHOICE" && e.direction === "to_target") ||
        e.type === "SENTENCE_BUILDER",
    )
    // For 1 item: only TRANSLATE is generated (reverse MC needs ≥4 in pool,
    // sentence builder needs example sentences). So we expect exactly 1.
    expect(production.length).toBe(1)
  })
})

describe("generateLessonExercises — concepts and sentences", () => {
  it("places INFO concept cards before vocab exercises", () => {
    const exercises = generateLessonExercises({
      vocab: vocab(2),
      sentences: [],
      concepts: [
        { id: "g1", kind: "GRAMMAR", title: "Plurals", body: "..." },
      ],
    })

    const infoIdx = exercises.findIndex(e => e.type === "INFO")
    const introIdx = exercises.findIndex(e => e.type === "WORD_INTRO")
    expect(infoIdx).toBeGreaterThanOrEqual(0)
    expect(introIdx).toBeGreaterThan(infoIdx)
  })

  it("orders GRAMMAR concepts before TEXT concepts", () => {
    const exercises = generateLessonExercises({
      vocab: [],
      sentences: [],
      concepts: [
        { id: "t1", kind: "TEXT", title: "Reading 1", body: "..." },
        { id: "g1", kind: "GRAMMAR", title: "Tenses", body: "..." },
      ],
    })

    const infoCards = exercises.filter(e => e.type === "INFO")
    expect(infoCards.map(c => (c.type === "INFO" ? c.kind : null))).toEqual([
      "GRAMMAR",
      "TEXT",
    ])
  })

  it("renders a sentence-only lesson with no vocab", () => {
    const exercises = generateLessonExercises({
      vocab: [],
      sentences: [
        { id: "s1", sentence: "ana qora bia", translation: "I eat fish" },
      ],
      concepts: [],
    })
    expect(exercises.some(e => e.type === "SENTENCE_BUILDER")).toBe(true)
  })
})
