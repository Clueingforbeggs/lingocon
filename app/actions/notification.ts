"use server"

import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth-helpers"

/** Most recent notifications for the signed-in user (newest first). */
export async function getNotifications(limit = 15) {
  const userId = await getUserId()
  if (!userId) return { data: [] }

  const data = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  })

  return { data }
}

/** Unread count for the bell badge. */
export async function getUnreadNotificationCount() {
  const userId = await getUserId()
  if (!userId) return { count: 0 }

  const count = await prisma.notification.count({
    where: { userId, read: false },
  })

  return { count }
}

/**
 * Mark notifications read. With no ids, marks all of the user's unread
 * notifications read (used when the bell is opened).
 */
export async function markNotificationsRead(ids?: string[]) {
  const userId = await getUserId()
  if (!userId) return { success: false }

  await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  })

  return { success: true }
}
