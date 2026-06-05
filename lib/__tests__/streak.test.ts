import { describe, it, expect } from "vitest"
import { nextStreak, isSameUtcDay } from "../streak"

const day = (iso: string) => new Date(iso)

describe("nextStreak", () => {
  it("starts a streak at 1 on first ever study", () => {
    const r = nextStreak(null, 0, day("2026-06-05T10:00:00Z"))
    expect(r).toEqual({ streak: 1, isNewDay: true, bonusXp: 0 })
  })

  it("does not advance when studying again the same day", () => {
    const r = nextStreak(day("2026-06-05T08:00:00Z"), 4, day("2026-06-05T22:00:00Z"))
    expect(r.streak).toBe(4)
    expect(r.isNewDay).toBe(false)
    expect(r.bonusXp).toBe(0)
  })

  it("increments by one on the next calendar day", () => {
    const r = nextStreak(day("2026-06-05T23:00:00Z"), 4, day("2026-06-06T01:00:00Z"))
    expect(r.streak).toBe(5)
    expect(r.isNewDay).toBe(true)
  })

  it("resets to 1 after a missed day", () => {
    const r = nextStreak(day("2026-06-05T10:00:00Z"), 9, day("2026-06-07T10:00:00Z"))
    expect(r.streak).toBe(1)
    expect(r.isNewDay).toBe(true)
  })

  it("awards a bonus every 7th day", () => {
    const r = nextStreak(day("2026-06-05T10:00:00Z"), 6, day("2026-06-06T10:00:00Z"))
    expect(r.streak).toBe(7)
    expect(r.bonusXp).toBe(50)
  })

  it("does not award a bonus on non-multiples of 7", () => {
    const r = nextStreak(day("2026-06-05T10:00:00Z"), 7, day("2026-06-06T10:00:00Z"))
    expect(r.streak).toBe(8)
    expect(r.bonusXp).toBe(0)
  })

  it("treats clock skew (past timestamp) as same day, no change", () => {
    const r = nextStreak(day("2026-06-05T10:00:00Z"), 3, day("2026-06-05T09:00:00Z"))
    expect(r.streak).toBe(3)
    expect(r.isNewDay).toBe(false)
  })
})

describe("isSameUtcDay", () => {
  it("is true for two times on the same UTC day", () => {
    expect(isSameUtcDay(day("2026-06-05T00:01:00Z"), day("2026-06-05T23:59:00Z"))).toBe(true)
  })

  it("is false across a day boundary", () => {
    expect(isSameUtcDay(day("2026-06-05T23:59:00Z"), day("2026-06-06T00:01:00Z"))).toBe(false)
  })
})
