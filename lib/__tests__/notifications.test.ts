import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    notification: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

import { createNotification } from "@/lib/notifications"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createNotification", () => {
  it("creates a notification for a different recipient", async () => {
    await createNotification({ recipientId: "u1", type: "NEW_FOLLOWER", actorId: "u2" })
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1)
    const arg = mockPrisma.notification.create.mock.calls[0][0]
    expect(arg.data.userId).toBe("u1")
    expect(arg.data.type).toBe("NEW_FOLLOWER")
    expect(arg.data.actorId).toBe("u2")
  })

  it("skips self-notifications (actor === recipient)", async () => {
    await createNotification({ recipientId: "u1", type: "NEW_FOLLOWER", actorId: "u1" })
    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
  })

  it("is best-effort — swallows DB errors", async () => {
    mockPrisma.notification.create.mockRejectedValueOnce(new Error("db down"))
    await expect(
      createNotification({ recipientId: "u1", type: "NEW_COMMENT", actorId: "u2" }),
    ).resolves.toBeUndefined()
  })

  it("defaults missing optional ids to null", async () => {
    await createNotification({ recipientId: "u1", type: "LANGUAGE_FAVORITED" })
    const arg = mockPrisma.notification.create.mock.calls[0][0]
    expect(arg.data.actorId).toBeNull()
    expect(arg.data.languageId).toBeNull()
    expect(arg.data.entityId).toBeNull()
  })
})
