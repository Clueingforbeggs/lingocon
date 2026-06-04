import type {
  Exercise,
  MultipleChoiceExercise,
  TranslateExercise,
  MatchPairsExercise,
} from "@/types/lesson"

export interface VocabItem {
  id: string
  lemma: string       // conlang word
  gloss: string       // native meaning
  ipa?: string | null
  partOfSpeech?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(correct: VocabItem, pool: VocabItem[], count: number, field: "lemma" | "gloss"): string[] {
  const others = pool.filter(v => v.id !== correct.id)
  return shuffle(others)
    .slice(0, count)
    .map(v => v[field])
}

// ─── Exercise builders ────────────────────────────────────────────────────────

function buildMultipleChoice(
  item: VocabItem,
  pool: VocabItem[],
  direction: "to_native" | "to_target",
): MultipleChoiceExercise {
  const isToNative = direction === "to_native"
  const word = isToNative ? item.lemma : item.gloss
  const correctText = isToNative ? item.gloss : item.lemma
  const distractorField: "lemma" | "gloss" = isToNative ? "gloss" : "lemma"

  const distractors = pickDistractors(item, pool, 3, distractorField)
  const options = shuffle([
    { id: `${item.id}-c`, text: correctText, correct: true },
    ...distractors.map((t, i) => ({ id: `${item.id}-w${i}`, text: t, correct: false })),
  ])

  return {
    type: "MULTIPLE_CHOICE",
    id: `mc-${direction}-${item.id}`,
    direction,
    prompt: isToNative ? "What does this mean?" : "How do you say this?",
    word,
    options,
  }
}

function buildTranslate(
  item: VocabItem,
  direction: "to_native" | "to_target",
): TranslateExercise {
  const isToNative = direction === "to_native"
  return {
    type: "TRANSLATE",
    id: `tr-${direction}-${item.id}`,
    direction,
    prompt: isToNative ? "Translate this word" : "How do you write this?",
    word: isToNative ? item.lemma : item.gloss,
    answer: isToNative ? item.gloss : item.lemma,
    hint: item.ipa ? `/${item.ipa}/` : item.partOfSpeech ?? undefined,
  }
}

function buildMatchPairs(chunk: VocabItem[]): MatchPairsExercise {
  return {
    type: "MATCH_PAIRS",
    id: `match-${chunk.map(v => v.id).join("-")}`,
    // Right column is shuffled independently so columns don't align visually
    pairs: chunk.map(v => ({ id: v.id, left: v.lemma, right: v.gloss })),
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generates a Duolingo-style exercise sequence from a list of vocabulary items.
 *
 * Structure per lesson:
 *  1. MATCH_PAIRS warm-up (groups of ≤6)
 *  2. MULTIPLE_CHOICE (conlang→native) for every item
 *  3. TRANSLATE (native→conlang) for a random half of items
 *  4. MULTIPLE_CHOICE (native→conlang) for items with enough pool distractors
 */
export function generateExercises(items: VocabItem[]): Exercise[] {
  if (items.length === 0) return []

  const exercises: Exercise[] = []

  // 1. Match-pairs warm-up — chunks of up to 6 items
  for (let i = 0; i < items.length; i += 6) {
    const chunk = items.slice(i, i + 6)
    if (chunk.length >= 2) {
      exercises.push(buildMatchPairs(shuffle(chunk)))
    }
  }

  const recognition: Exercise[] = []
  const production: Exercise[] = []

  for (const item of items) {
    // Always: recognition MC (conlang → native)
    recognition.push(buildMultipleChoice(item, items, "to_native"))

    // Production: typed translate (native → conlang) for every item
    production.push(buildTranslate(item, "to_target"))

    // Bonus: reverse MC (native → conlang) when pool is large enough for distractors
    if (items.length >= 4) {
      recognition.push(buildMultipleChoice(item, items, "to_native"))
    }
  }

  // Interleave recognition and production so variety is high throughout
  const interleaved: Exercise[] = []
  const recShuffled = shuffle(recognition)
  const prodShuffled = shuffle(production)
  const maxLen = Math.max(recShuffled.length, prodShuffled.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < recShuffled.length) interleaved.push(recShuffled[i])
    if (i < prodShuffled.length) interleaved.push(prodShuffled[i])
  }

  return [...exercises, ...interleaved]
}
