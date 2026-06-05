/**
 * Daily streak calculation for language enrollments.
 *
 * Streaks are computed from the *previous* `lastStudied` value, so this must run
 * BEFORE `lastStudied` is updated to the current study time. Calling it multiple
 * times within the same day is idempotent (the streak does not advance again).
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24
const STREAK_BONUS_INTERVAL = 7
const STREAK_BONUS_XP = 50

/** Number of whole UTC-day boundaries crossed between two dates. */
function dayDelta(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((b - a) / MS_PER_DAY)
}

export interface StreakResult {
  /** New streak value to persist. */
  streak: number
  /** True if this study crosses into a new day (streak changed / first study). */
  isNewDay: boolean
  /** Bonus XP earned for hitting a streak milestone (0 if none). */
  bonusXp: number
}

/**
 * Compute the next streak state.
 *
 * @param lastStudied previous study timestamp (null if never studied)
 * @param currentStreak previously persisted streak value
 * @param now current time (defaults to now)
 */
export function nextStreak(
  lastStudied: Date | null,
  currentStreak: number,
  now: Date = new Date(),
): StreakResult {
  if (!lastStudied) {
    return { streak: 1, isNewDay: true, bonusXp: streakBonus(1) }
  }

  const delta = dayDelta(lastStudied, now)

  if (delta <= 0) {
    // Same day (or clock skew) — no change.
    return { streak: currentStreak, isNewDay: false, bonusXp: 0 }
  }

  if (delta === 1) {
    const streak = currentStreak + 1
    return { streak, isNewDay: true, bonusXp: streakBonus(streak) }
  }

  // Missed one or more days — streak resets.
  return { streak: 1, isNewDay: true, bonusXp: streakBonus(1) }
}

function streakBonus(streak: number): number {
  return streak > 0 && streak % STREAK_BONUS_INTERVAL === 0 ? STREAK_BONUS_XP : 0
}

/** True if two dates fall on the same UTC calendar day. */
export function isSameUtcDay(a: Date, b: Date): boolean {
  return dayDelta(a, b) === 0
}
