import type {
  Exercise,
  MultipleChoiceExercise,
  TranslateExercise,
  MatchPairsExercise,
  SentenceBuilderExercise,
  InfoExercise,
} from "@/types/lesson"

export interface VocabItem {
  id: string
  lemma: string       // conlang word
  gloss: string       // native meaning
  ipa?: string | null
  partOfSpeech?: string | null
  exampleSentences?: {
    id: string
    sentence: string
    translation: string
    gloss: string | null
  }[]
}

export interface SentenceItem {
  id: string
  sentence: string      // conlang sentence
  translation: string   // native translation
}

export interface ConceptItem {
  id: string
  kind: "GRAMMAR" | "TEXT"
  title: string
  body: string          // plain-text excerpt
  href?: string         // link to full page
}

export interface LessonContent {
  vocab: VocabItem[]
  sentences: SentenceItem[]
  concepts: ConceptItem[]
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

function buildSentenceBuilder(
  item: VocabItem,
  pool: VocabItem[]
): SentenceBuilderExercise | null {
  if (!item.exampleSentences || item.exampleSentences.length === 0) return null
  
  // Pick a random sentence
  const sentenceObj = item.exampleSentences[Math.floor(Math.random() * item.exampleSentences.length)]
  
  // Strip punctuation and split into words
  const cleanSentence = sentenceObj.sentence.replace(/[.,!?()";:]/g, "").trim()
  const correctWords = cleanSentence.split(/\s+/).filter(Boolean)
  if (correctWords.length < 2) return null // Needs at least 2 words to be a builder exercise
  
  // Pick distractors from other words in the pool
  const distractors: string[] = []
  const otherWords = pool.filter(v => v.id !== item.id)
  
  for (let i = 0; i < Math.min(3, otherWords.length); i++) {
    const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)].lemma
    if (!correctWords.includes(randomWord) && !distractors.includes(randomWord)) {
      distractors.push(randomWord)
    }
  }
  
  const allWords = shuffle([...correctWords, ...distractors])
  
  return {
    type: "SENTENCE_BUILDER",
    id: `sb-${item.id}-${sentenceObj.id}`,
    prompt: sentenceObj.translation,
    sentence: cleanSentence,
    words: allWords.map((text, idx) => ({ id: `word-${idx}`, text }))
  }
}

/** Sentence-builder from an explicit sentence item (not tied to a vocab word). */
function buildSentenceBuilderFromSentence(
  sentence: SentenceItem,
  distractorPool: string[],
): SentenceBuilderExercise | null {
  const cleanSentence = sentence.sentence.replace(/[.,!?()";:]/g, "").trim()
  const correctWords = cleanSentence.split(/\s+/).filter(Boolean)
  if (correctWords.length < 2) return null

  const distractors: string[] = []
  const pool = shuffle(distractorPool.filter(Boolean))
  for (const candidate of pool) {
    if (distractors.length >= 3) break
    if (!correctWords.includes(candidate) && !distractors.includes(candidate)) {
      distractors.push(candidate)
    }
  }

  const allWords = shuffle([...correctWords, ...distractors])
  return {
    type: "SENTENCE_BUILDER",
    id: `sb-sentence-${sentence.id}`,
    prompt: sentence.translation,
    sentence: cleanSentence,
    words: allWords.map((text, idx) => ({ id: `word-${idx}`, text })),
  }
}

function buildInfoCard(concept: ConceptItem): InfoExercise {
  const trimmed = concept.body.length > 600 ? `${concept.body.slice(0, 600).trim()}…` : concept.body
  return {
    type: "INFO",
    id: `info-${concept.kind.toLowerCase()}-${concept.id}`,
    kind: concept.kind,
    title: concept.title,
    body: trimmed,
    href: concept.href,
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generates a Duolingo-style exercise sequence from a list of vocabulary items.
 *
 * Structure per lesson:
 *  1. MATCH_PAIRS warm-up (groups of ≤6)
 *  2. Recognition: MULTIPLE_CHOICE (conlang→native) for every item
 *  3. Production: TRANSLATE (native→conlang) for every item
 *  4. Production: MULTIPLE_CHOICE (native→conlang) when the pool is large enough
 *
 * Recognition and production exercises are then shuffled and interleaved.
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
      production.push(buildMultipleChoice(item, items, "to_target"))
    }

    // Sentence builder: if example sentences exist
    const sbExercise = buildSentenceBuilder(item, items)
    if (sbExercise) {
      production.push(sbExercise)
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

/**
 * Builds a full lesson session from mixed content (vocab + sentences + grammar/
 * text concepts). Concepts are taught first as non-graded INFO cards, then the
 * graded vocab + sentence exercises follow.
 *
 * A lesson is "playable" whenever this returns at least one exercise — including
 * concept-only (reading) lessons, which previously could not be started at all.
 */
export function generateLessonExercises(content: LessonContent): Exercise[] {
  const { vocab, sentences, concepts } = content

  // 1. Teaching cards (grammar before text), shown up front.
  const grammarFirst = [...concepts].sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === "GRAMMAR" ? -1 : 1,
  )
  const infoCards = grammarFirst.map(buildInfoCard)

  // 2. Vocab exercises (existing pipeline).
  const vocabExercises = vocab.length > 0 ? generateExercises(vocab) : []

  // 3. Sentence exercises from explicit sentence items.
  const distractorPool = vocab.map((v) => v.lemma)
  const sentenceExercises: Exercise[] = []
  for (const sentence of sentences) {
    const sb = buildSentenceBuilderFromSentence(sentence, distractorPool)
    if (sb) sentenceExercises.push(sb)
  }

  return [...infoCards, ...vocabExercises, ...shuffle(sentenceExercises)]
}

/** Whether a set of lesson item types can produce a playable session. */
export function lessonHasPlayableContent(types: string[]): boolean {
  return types.some((t) => t === "VOCAB" || t === "SENTENCE" || t === "GRAMMAR" || t === "TEXT")
}
