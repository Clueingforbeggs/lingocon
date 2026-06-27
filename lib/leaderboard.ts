/**
 * Weekly leaderboard helpers.
 *
 * The leaderboard ranks learners by XP earned since the start of the current
 * week (Monday 00:00 UTC). Keeping the week boundary in a pure, tested helper
 * makes the reset behavior unambiguous and independent of server timezone.
 */

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string | null
  image: string | null
  xp: number
}

/**
 * Start of the ISO-style week (Monday 00:00:00.000 UTC) containing `date`.
 * Sunday counts as the last day of the previous week.
 */
export function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
