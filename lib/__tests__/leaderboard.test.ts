import { describe, it, expect } from "vitest"
import { startOfWeekUtc } from "@/lib/leaderboard"

describe("startOfWeekUtc", () => {
  it("returns Monday 00:00 UTC for a midweek date", () => {
    // 2026-06-24 is a Wednesday
    const result = startOfWeekUtc(new Date("2026-06-24T15:30:00Z"))
    expect(result.toISOString()).toBe("2026-06-22T00:00:00.000Z") // Monday
  })

  it("treats Sunday as the end of the week (previous Monday)", () => {
    // 2026-06-28 is a Sunday
    const result = startOfWeekUtc(new Date("2026-06-28T23:59:59Z"))
    expect(result.toISOString()).toBe("2026-06-22T00:00:00.000Z")
  })

  it("returns the same Monday at midnight when given that Monday", () => {
    const result = startOfWeekUtc(new Date("2026-06-22T00:00:00Z"))
    expect(result.toISOString()).toBe("2026-06-22T00:00:00.000Z")
  })

  it("rolls into the previous month/year across boundaries", () => {
    // 2026-01-01 is a Thursday → week starts Mon 2025-12-29
    const result = startOfWeekUtc(new Date("2026-01-01T12:00:00Z"))
    expect(result.toISOString()).toBe("2025-12-29T00:00:00.000Z")
  })
})
