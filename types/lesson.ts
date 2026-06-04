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

export type Exercise =
  | MultipleChoiceExercise
  | TranslateExercise
  | MatchPairsExercise

// ─── Lesson Result ────────────────────────────────────────────────────────────

export interface LessonResult {
  lessonId: string
  xpEarned: number
  heartsLeft: number
  totalExercises: number
  correctCount: number
}
