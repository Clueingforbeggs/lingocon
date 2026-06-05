/**
 * Learning-path ordering and unlock logic, shared by the learner course page
 * and the lesson page (which enforces locking server-side).
 *
 * The path is: units (ordered) → lessons (ordered within a unit). Lessons with
 * no unit sort after all units, preserving the behavior of courses created
 * before units existed (all lessons unit-less → ordered by their `order`).
 *
 * Unlock rule (sequential): a *playable* lesson is unlocked once every playable
 * lesson before it is completed. Non-playable lessons (no exercises yet) are
 * always viewable and never gate progression.
 */

export interface PathLesson {
  id: string
  order: number
  unitId: string | null
  hasVocab: boolean
}

export interface PathUnit {
  id: string
  order: number
}

export type LessonStatus = "done" | "current" | "locked" | "open"

const UNITLESS_ORDER = Number.MAX_SAFE_INTEGER

export function orderLessonSequence<T extends { order: number; unitId: string | null }>(
  lessons: T[],
  units: PathUnit[],
): T[] {
  const unitOrder = new Map(units.map((u) => [u.id, u.order]))
  return [...lessons].sort((a, b) => {
    const ua = a.unitId ? unitOrder.get(a.unitId) ?? UNITLESS_ORDER : UNITLESS_ORDER
    const ub = b.unitId ? unitOrder.get(b.unitId) ?? UNITLESS_ORDER : UNITLESS_ORDER
    if (ua !== ub) return ua - ub
    return a.order - b.order
  })
}

/** Compute lesson status for an already-ordered sequence. */
export function computeLessonStatuses(
  orderedLessons: PathLesson[],
  completedLessonIds: Set<string>,
): Map<string, LessonStatus> {
  const statuses = new Map<string, LessonStatus>()
  let foundCurrent = false

  for (const lesson of orderedLessons) {
    if (!lesson.hasVocab) {
      statuses.set(lesson.id, "open")
      continue
    }
    if (completedLessonIds.has(lesson.id)) {
      statuses.set(lesson.id, "done")
      continue
    }
    if (!foundCurrent) {
      statuses.set(lesson.id, "current")
      foundCurrent = true
    } else {
      statuses.set(lesson.id, "locked")
    }
  }

  return statuses
}

export function isLessonAccessible(status: LessonStatus | undefined): boolean {
  return status === "done" || status === "current" || status === "open"
}

/** Convenience: full status map straight from unordered lessons + units. */
export function buildLessonStatuses(
  lessons: PathLesson[],
  units: PathUnit[],
  completedLessonIds: Set<string>,
): Map<string, LessonStatus> {
  return computeLessonStatuses(orderLessonSequence(lessons, units), completedLessonIds)
}
