"use server"

import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth-helpers"
import { startOfWeekUtc, type LeaderboardEntry } from "@/lib/leaderboard"

export interface WeeklyLeaderboard {
  weekStart: string
  entries: LeaderboardEntry[]
  /** The signed-in user's standing, even when outside the top results. */
  me: { rank: number; xp: number } | null
}

/**
 * Top learners by XP earned since the start of the current week (Monday UTC),
 * aggregated from the `XPEvent` ledger.
 */
export async function getWeeklyLeaderboard(limit = 20): Promise<WeeklyLeaderboard> {
  const weekStart = startOfWeekUtc(new Date())
  const take = Math.min(Math.max(limit, 1), 100)

  const grouped = await prisma.xPEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: weekStart } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take,
  })

  const userIds = grouped.map((g) => g.userId)
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true },
      })
    : []
  const userById = new Map(users.map((u) => [u.id, u]))

  const entries: LeaderboardEntry[] = grouped.map((g, i) => {
    const u = userById.get(g.userId)
    return {
      rank: i + 1,
      userId: g.userId,
      name: u?.name ?? null,
      image: u?.image ?? null,
      xp: g._sum.amount ?? 0,
    }
  })

  // The signed-in user's standing, even when outside the top `limit`.
  const meId = await getUserId()
  let me: WeeklyLeaderboard["me"] = null

  if (meId) {
    const inTop = entries.find((e) => e.userId === meId)
    if (inTop) {
      me = { rank: inTop.rank, xp: inTop.xp }
    } else {
      const mine = await prisma.xPEvent.aggregate({
        where: { userId: meId, createdAt: { gte: weekStart } },
        _sum: { amount: true },
      })
      const myXp = mine._sum.amount ?? 0
      if (myXp > 0) {
        // Rank = (number of users with strictly more weekly XP) + 1.
        const ahead = await prisma.xPEvent.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: weekStart } },
          _sum: { amount: true },
          having: { amount: { _sum: { gt: myXp } } },
        })
        me = { rank: ahead.length + 1, xp: myXp }
      }
    }
  }

  return { weekStart: weekStart.toISOString(), entries, me }
}
