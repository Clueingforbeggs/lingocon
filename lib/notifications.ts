/**
 * In-app notification emission.
 *
 * Best-effort by design (mirrors `lib/utils/activity.ts`): a failure to record a
 * notification must never break the user action that triggered it, so errors are
 * logged and swallowed. Self-notifications are dropped (you don't get notified
 * about your own actions).
 *
 * This is a plain server module (not `"use server"`) so it can export a
 * synchronous-shaped helper consumed by other Server Actions.
 */
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { NotificationType } from "@prisma/client"

export interface CreateNotificationInput {
  /** The user who should receive the notification. */
  recipientId: string
  type: NotificationType
  /** Who triggered it. A snapshot of their name/image lives in `data`. */
  actorId?: string | null
  languageId?: string | null
  /** Related entity id, e.g. a comment id. */
  entityId?: string | null
  /**
   * Render snapshot — denormalized so the bell needs no joins:
   * `{ actorName, actorImage, languageName, languageSlug, excerpt, href }`.
   */
  data?: Prisma.InputJsonValue
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  // Never notify someone about their own action.
  if (input.actorId && input.actorId === input.recipientId) return

  try {
    await prisma.notification.create({
      data: {
        userId: input.recipientId,
        type: input.type,
        actorId: input.actorId ?? null,
        languageId: input.languageId ?? null,
        entityId: input.entityId ?? null,
        data: input.data ?? Prisma.JsonNull,
      },
    })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}
