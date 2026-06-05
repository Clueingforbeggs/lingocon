import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FSRSCard,
  type RecordLog,
  type Grade,
} from "ts-fsrs"

// XP awarded per card type and rating
export const XP_TABLE = {
  VOCAB_RECOGNITION: { AGAIN: 0, HARD: 3, GOOD: 5,  EASY: 7  },
  VOCAB_PRODUCTION:  { AGAIN: 0, HARD: 6, GOOD: 10, EASY: 14 },
  CLOZE:             { AGAIN: 0, HARD: 8, GOOD: 15, EASY: 20 },
  GRAMMAR_READ:      { AGAIN: 0, HARD: 5, GOOD: 8,  EASY: 10 },
} as const

export type CardTypeKey = keyof typeof XP_TABLE
export type RatingKey = "AGAIN" | "HARD" | "GOOD" | "EASY"

// Lesson XP economy — shared by server (authoritative) and client (display only).
export const LESSON_XP = {
  base:      10, // awarded for completing a lesson
  perHeart:   5, // bonus per heart remaining
  maxHearts:  3,
  replay:     5, // reduced XP for replaying an already-completed lesson (once per day)
} as const

/** Authoritative lesson XP for a *first* completion given remaining hearts. */
export function computeLessonXp(heartsLeft: number): number {
  const hearts = Math.max(0, Math.min(LESSON_XP.maxHearts, Math.floor(heartsLeft)))
  return LESSON_XP.base + LESSON_XP.perHeart * hearts
}

// ts-fsrs Rating enum values (Grade = Rating excluding Manual)
export const RATING_MAP: Record<RatingKey, Grade> = {
  AGAIN: Rating.Again,
  HARD:  Rating.Hard,
  GOOD:  Rating.Good,
  EASY:  Rating.Easy,
}

const f = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: 365 }))

export interface FSRSCardState {
  due:            Date
  stability:      number
  difficulty:     number
  elapsed_days:   number
  scheduled_days: number
  reps:           number
  lapses:         number
  state:          State  // State.New=0 Learning=1 Review=2 Relearning=3
  last_review?:   Date
}

export interface ScheduleResult {
  card: FSRSCardState
  xp:   number
}

// Per-card-type response-time thresholds (ms).
// Exceeding the threshold downgrades the effective rating by one step.
const RESPONSE_TIME_LIMIT: Record<CardTypeKey, number> = {
  VOCAB_RECOGNITION: 4_000,
  VOCAB_PRODUCTION:  8_000,
  CLOZE:            12_000,
  GRAMMAR_READ:     15_000,
}

/**
 * Schedule the next review for a card.
 *
 * Applies a per-card-type time limit: if the response took longer than the
 * threshold for the card type, the rating is downgraded one step
 * (Easy→Good→Hard→Again) to reflect actual recall effort.
 */
export function scheduleReview(
  cardState: FSRSCardState,
  rawRating: RatingKey,
  timeTaken: number,
  cardType: CardTypeKey,
  now: Date = new Date(),
): ScheduleResult {
  // Downgrade rating if response exceeded the card-type time limit
  const effectiveRating = applyTimeLimitRule(rawRating, timeTaken, cardType)
  const fsrsRating = RATING_MAP[effectiveRating]

  // Build ts-fsrs card from persisted state
  const card: FSRSCard = {
    due:            cardState.due,
    stability:      cardState.stability,
    difficulty:     cardState.difficulty,
    elapsed_days:   cardState.elapsed_days,
    scheduled_days: cardState.scheduled_days,
    reps:           cardState.reps,
    lapses:         cardState.lapses,
    state:          cardState.state,
    last_review:    cardState.last_review,
  }

  const scheduling: RecordLog = f.repeat(card, now)
  const next = scheduling[fsrsRating].card

  const xp = XP_TABLE[cardType][effectiveRating]

  return {
    card: {
      due:            next.due,
      stability:      next.stability,
      difficulty:     next.difficulty,
      elapsed_days:   next.elapsed_days,
      scheduled_days: next.scheduled_days,
      reps:           next.reps,
      lapses:         next.lapses,
      state:          next.state,
      last_review:    next.last_review,
    },
    xp,
  }
}

export function createNewCard(): FSRSCardState {
  const c = createEmptyCard()
  return {
    due:            c.due,
    stability:      c.stability,
    difficulty:     c.difficulty,
    elapsed_days:   c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps:           c.reps,
    lapses:         c.lapses,
    state:          c.state,
    last_review:    c.last_review,
  }
}

function applyTimeLimitRule(rating: RatingKey, timeTaken: number, cardType: CardTypeKey): RatingKey {
  if (timeTaken <= RESPONSE_TIME_LIMIT[cardType]) return rating
  const order: RatingKey[] = ["AGAIN", "HARD", "GOOD", "EASY"]
  const idx = order.indexOf(rating)
  return idx > 0 ? order[idx - 1] : rating
}

/** Level formula: level = floor(sqrt(xp / 50)) */
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50))
}

export function levelToXP(level: number): number {
  return level * level * 50
}

export function xpToNextLevel(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = xpToLevel(xp)
  const currentLevelXP = levelToXP(level)
  const nextLevelXP = levelToXP(level + 1)
  const needed = nextLevelXP - currentLevelXP
  const current = xp - currentLevelXP
  return { level, current, needed, percent: Math.round((current / needed) * 100) }
}
