// ─── Exercise Types ───────────────────────────────────────────────────────────

export interface MultipleChoiceExercise {
  type: "MULTIPLE_CHOICE"
  id: string
  /** Direction of the tested knowledge */
  direction: "to_native" | "to_target"
  prompt: string
  /** The word/phrase being tested (shown prominently) */
  word: string
  options: { id: string; text: string; correct: boolean }[]
}

export interface TranslateExercise {
  type: "TRANSLATE"
  id: string
  direction: "to_native" | "to_target"
  prompt: string
  word: string
  /** Normalised expected answer (lowercase, trimmed) */
  answer: string
  /** Optional IPA or part-of-speech shown after correct reveal */
  hint?: string
}

export interface MatchPairsExercise {
  type: "MATCH_PAIRS"
  id: string
  /** Each pair: left = conlang word, right = native gloss */
  pairs: { id: string; left: string; right: string }[]
}

export interface SentenceBuilderExercise {
  type: "SENTENCE_BUILDER"
  id: string
  prompt: string // e.g. Native translation
  sentence: string // Correct conlang sentence
  words: { id: string; text: string }[] // Scrambled word pool
}

/** Non-graded teaching card (grammar concept or reading reference). */
export interface InfoExercise {
  type: "INFO"
  id: string
  kind: "GRAMMAR" | "TEXT"
  title: string
  body: string
  /** Optional deep-link to the full grammar page / text. */
  href?: string
}

export type Exercise =
  | MultipleChoiceExercise
  | TranslateExercise
  | MatchPairsExercise
  | SentenceBuilderExercise
  | InfoExercise

// ─── Lesson Result ────────────────────────────────────────────────────────────

export interface LessonResult {
  lessonId: string
  xpEarned: number
  heartsLeft: number
  totalExercises: number
  correctCount: number
}
