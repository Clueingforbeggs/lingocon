"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { scheduleReview, createNewCard, type CardTypeKey, type RatingKey, type FSRSCardState } from "@/lib/fsrs"
import { State } from "ts-fsrs"
import { revalidatePath } from "next/cache"

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollInLanguage(languageId: string, courseId?: string) {
  const userId = await requireAuth()

  const existing = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (existing) return { data: existing }

  const enrollment = await prisma.enrollment.create({
    data: { userId, languageId, courseId: courseId ?? null },
  })

  // Seed vocab cards from all dictionary entries for this language
  await seedVocabCards(enrollment.id, languageId)

  revalidatePath(`/learn/${await getSlugForLanguage(languageId)}`)
  return { data: enrollment }
}

export async function getEnrollment(languageId: string) {
  const userId = await requireAuth()
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
    include: { course: { select: { id: true, title: true } } },
  })
  return { data: enrollment }
}

export async function getUserEnrollments() {
  const userId = await requireAuth()
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      language: { select: { id: true, name: true, slug: true, flagUrl: true } },
      course:   { select: { id: true, title: true } },
    },
    orderBy: { lastStudied: "desc" },
  })
  return { data: enrollments }
}

// ─── Study Queue ──────────────────────────────────────────────────────────────

export async function getDueCards(languageId: string, limit = 20) {
  const userId = await requireAuth()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (!enrollment) return { data: [] }

  const now = new Date()

  // 70% due reviews, 30% new cards
  const reviewLimit = Math.ceil(limit * 0.7)
  const newLimit = limit - reviewLimit

  const [dueCards, newCards] = await Promise.all([
    prisma.studyCard.findMany({
      where: {
        enrollmentId: enrollment.id,
        state: { in: ["LEARNING", "REVIEW", "RELEARNING"] },
        due: { lte: now },
      },
      orderBy: { due: "asc" },
      take: reviewLimit,
    }),
    prisma.studyCard.findMany({
      where: {
        enrollmentId: enrollment.id,
        state: "NEW",
      },
      orderBy: { createdAt: "asc" },
      take: newLimit,
    }),
  ])

  return { data: [...dueCards, ...newCards] }
}

export async function getLearnStats(languageId: string) {
  const userId = await requireAuth()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (!enrollment) return { data: null }

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const [stateCounts, dueToday, totalReviews] = await Promise.all([
    prisma.studyCard.groupBy({
      by: ["state"],
      where: { enrollmentId: enrollment.id },
      _count: true,
    }),
    prisma.studyCard.count({
      where: { enrollmentId: enrollment.id, due: { lte: tomorrow } },
    }),
    prisma.cardReview.count({
      where: { card: { enrollmentId: enrollment.id } },
    }),
  ])

  const states = Object.fromEntries(stateCounts.map(s => [s.state, s._count]))

  return {
    data: {
      enrollment,
      states: {
        new:        states["NEW"]        ?? 0,
        learning:   states["LEARNING"]   ?? 0,
        review:     states["REVIEW"]     ?? 0,
        relearning: states["RELEARNING"] ?? 0,
      },
      dueToday,
      totalReviews,
    },
  }
}

// ─── Review Submission ────────────────────────────────────────────────────────

export async function submitReview(
  cardId: string,
  rating: RatingKey,
  timeTaken: number,
) {
  const userId = await requireAuth()

  const card = await prisma.studyCard.findFirst({
    where: { id: cardId, enrollment: { userId } },
    include: { enrollment: true },
  })
  if (!card) return { error: "Card not found" }

  // Prevent double-submit and XP farming
  if (card.lastReview && Date.now() - card.lastReview.getTime() < 2000) {
    return { error: "Too soon" }
  }

  const { card: next, xp } = scheduleReview(
    {
      due:            card.due,
      stability:      card.stability,
      difficulty:     card.difficulty,
      elapsed_days:   card.elapsedDays,
      scheduled_days: card.scheduledDays,
      reps:           card.reps,
      lapses:         card.lapses,
      state:          dbStateToFSRS(card.state),
      last_review:    card.lastReview ?? undefined,
    },
    rating,
    timeTaken,
    card.cardType as CardTypeKey,
  )

  const [updatedCard] = await prisma.$transaction([
    prisma.studyCard.update({
      where: { id: cardId },
      data: {
        due:          next.due,
        stability:    next.stability,
        difficulty:   next.difficulty,
        elapsedDays:  next.elapsed_days,
        scheduledDays: next.scheduled_days,
        reps:         next.reps,
        lapses:       next.lapses,
        state:        fsrsStateToDb(next.state),
        lastReview:   new Date(),
        updatedAt:    new Date(),
      },
    }),
    prisma.cardReview.create({
      data: { cardId, rating, timeTaken, xpEarned: xp },
    }),
    prisma.enrollment.update({
      where: { id: card.enrollmentId },
      data: {
        xp:         { increment: xp },
        lastStudied: new Date(),
      },
    }),
    prisma.xPEvent.create({
      data: {
        userId,
        languageId: card.enrollment.languageId,
        amount:     xp,
        reason:     "review",
      },
    }),
  ])

  return { data: { card: updatedCard, xpEarned: xp } }
}

// ─── Streak Update ────────────────────────────────────────────────────────────

export async function updateStreak(languageId: string) {
  const userId = await requireAuth()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (!enrollment) return

  const now = new Date()
  const lastStudied = enrollment.lastStudied

  if (!lastStudied) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { streak: 1, lastStudied: now },
    })
    return
  }

  const daysSinceLast = Math.floor(
    (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceLast === 0) return // same day
  if (daysSinceLast === 1) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { streak: { increment: 1 }, lastStudied: now },
    })
    // Streak bonus XP every 7 days
    if ((enrollment.streak + 1) % 7 === 0) {
      await prisma.xPEvent.create({
        data: { userId, languageId, amount: 50, reason: "streak_bonus" },
      })
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { xp: { increment: 50 } },
      })
    }
  } else {
    // Streak broken
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { streak: 1, lastStudied: now },
    })
  }
}

// ─── Lesson Completion ───────────────────────────────────────────────────────

export async function completeLesson(
  lessonId: string,
  xpEarned: number,
  heartsLeft: number,
) {
  const userId = await requireAuth()

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: { course: { select: { languageId: true } } },
  })
  if (!lesson) return { error: "Lesson not found" }

  const { languageId } = lesson.course

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (!enrollment) return { error: "Not enrolled" }

  await prisma.$transaction([
    prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { xpEarned, heartsLeft, completedAt: new Date() },
      create: { userId, lessonId, xpEarned, heartsLeft },
    }),
    prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { xp: { increment: xpEarned }, lastStudied: new Date() },
    }),
    prisma.xPEvent.create({
      data: { userId, languageId, amount: xpEarned, reason: "lesson_complete" },
    }),
  ])

  const slug = await getSlugForLanguage(languageId)
  revalidatePath(`/learn/${slug}`)
  return { data: { xpEarned } }
}

// ─── Perfect Session Bonus ────────────────────────────────────────────────────

export async function awardPerfectSession(languageId: string) {
  const userId = await requireAuth()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
  })
  if (!enrollment) return

  const PERFECT_BONUS = 25
  await prisma.$transaction([
    prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { xp: { increment: PERFECT_BONUS } },
    }),
    prisma.xPEvent.create({
      data: { userId, languageId, amount: PERFECT_BONUS, reason: "perfect_session" },
    }),
  ])
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCoursesForLanguage(languageId: string) {
  const courses = await prisma.course.findMany({
    where: { languageId, visibility: "PUBLISHED" },
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { order: "asc" },
  })
  return { data: courses }
}

export async function getCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      lessons: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { items: true } },
        },
      },
    },
  })
  return { data: course }
}

// ─── Studio: Course Management ────────────────────────────────────────────────

export async function createCourse(languageId: string, title: string, description?: string) {
  const userId = await requireAuth()

  const course = await prisma.course.create({
    data: { title, description, languageId, authorId: userId },
  })
  revalidatePath(`/studio/lang`)
  return { data: course }
}

export async function updateCourse(
  courseId: string,
  data: { title?: string; description?: string; visibility?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; coverImage?: string }
) {
  const userId = await requireAuth()
  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId: userId },
  })
  if (!course) return { error: "Not found" }

  const updated = await prisma.course.update({ where: { id: courseId }, data })
  revalidatePath(`/studio/lang`)
  return { data: updated }
}

export async function createLesson(courseId: string, title: string, description?: string) {
  const userId = await requireAuth()
  const course = await prisma.course.findFirst({ where: { id: courseId, authorId: userId } })
  if (!course) return { error: "Not found" }

  const lastLesson = await prisma.courseLesson.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  })

  const lesson = await prisma.courseLesson.create({
    data: { title, description, courseId, order: (lastLesson?.order ?? -1) + 1 },
  })
  revalidatePath(`/studio/lang`)
  return { data: lesson }
}

export async function addLessonItem(
  lessonId: string,
  type: "VOCAB" | "GRAMMAR" | "TEXT" | "SENTENCE",
  sourceId: string,
) {
  const userId = await requireAuth()
  const lesson = await prisma.courseLesson.findFirst({
    where: { id: lessonId, course: { authorId: userId } },
  })
  if (!lesson) return { error: "Not found" }

  const last = await prisma.lessonItem.findFirst({
    where: { lessonId },
    orderBy: { order: "desc" },
  })

  const item = await prisma.lessonItem.create({
    data: {
      lessonId,
      type,
      order: (last?.order ?? -1) + 1,
      dictEntryId:   type === "VOCAB"    ? sourceId : null,
      grammarPageId: type === "GRAMMAR"  ? sourceId : null,
      textId:        type === "TEXT"     ? sourceId : null,
      sentenceId:    type === "SENTENCE" ? sourceId : null,
    },
  })
  return { data: item }
}

export async function deleteLessonItem(itemId: string) {
  const userId = await requireAuth()
  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, lesson: { course: { authorId: userId } } },
  })
  if (!item) return { error: "Not found" }
  await prisma.lessonItem.delete({ where: { id: itemId } })
  return { data: true }
}

export async function deleteLesson(lessonId: string) {
  const userId = await requireAuth()
  const lesson = await prisma.courseLesson.findFirst({
    where: { id: lessonId, course: { authorId: userId } },
  })
  if (!lesson) return { error: "Not found" }
  await prisma.courseLesson.delete({ where: { id: lessonId } })
  return { data: true }
}

export async function deleteCourse(courseId: string) {
  const userId = await requireAuth()
  const course = await prisma.course.findFirst({ where: { id: courseId, authorId: userId } })
  if (!course) return { error: "Not found" }
  await prisma.course.delete({ where: { id: courseId } })
  revalidatePath(`/studio/lang`)
  return { data: true }
}

// ─── Card Seeding ─────────────────────────────────────────────────────────────

/**
 * Called on every study-session start to pick up vocabulary entries added
 * after initial enrollment. Processes up to 100 new entries per call so the
 * response stays fast; subsequent sessions will gradually catch up.
 */
export async function syncNewVocabCards(languageId: string) {
  const userId = await requireAuth()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId } },
    select: { id: true },
  })
  if (!enrollment) return

  // Find which dict entry IDs already have a recognition card for this enrollment
  const existing = await prisma.studyCard.findMany({
    where: {
      enrollmentId: enrollment.id,
      cardType: "VOCAB_RECOGNITION",
      dictEntryId: { not: null },
    },
    select: { dictEntryId: true },
  })
  const seenIds = new Set(existing.map(c => c.dictEntryId as string))

  const newEntries = await prisma.dictionaryEntry.findMany({
    where: { languageId, id: { notIn: [...seenIds] } },
    select: { id: true, lemma: true, gloss: true, ipa: true, partOfSpeech: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  if (newEntries.length === 0) return

  const base = createNewCard()
  await prisma.studyCard.createMany({
    data: newEntries.flatMap(e => [
      {
        enrollmentId: enrollment.id,
        dictEntryId:  e.id,
        cardType:     "VOCAB_RECOGNITION" as const,
        front:        e.lemma,
        back:         `${e.gloss}${e.ipa ? `\n/${e.ipa}/` : ""}${e.partOfSpeech ? ` · ${e.partOfSpeech}` : ""}`,
        due:          base.due,
        stability:    base.stability,
        difficulty:   base.difficulty,
        state:        "NEW" as const,
        elapsedDays:   base.elapsed_days,
        scheduledDays: base.scheduled_days,
      },
      {
        enrollmentId: enrollment.id,
        dictEntryId:  e.id,
        cardType:     "VOCAB_PRODUCTION" as const,
        front:        e.gloss,
        back:         `${e.lemma}${e.ipa ? ` /${e.ipa}/` : ""}`,
        due:          base.due,
        stability:    base.stability,
        difficulty:   base.difficulty,
        state:        "NEW" as const,
        elapsedDays:   base.elapsed_days,
        scheduledDays: base.scheduled_days,
      },
    ]),
    skipDuplicates: true,
  })
}

async function seedVocabCards(enrollmentId: string, languageId: string) {
  const entries = await prisma.dictionaryEntry.findMany({
    where: { languageId },
    select: { id: true, lemma: true, gloss: true, ipa: true, partOfSpeech: true },
    orderBy: { lemma: "asc" },
    take: 500, // cap initial seed
  })

  if (entries.length === 0) return

  const newCard = createNewCard()

  await prisma.studyCard.createMany({
    data: entries.flatMap(e => [
      {
        enrollmentId,
        dictEntryId: e.id,
        cardType:    "VOCAB_RECOGNITION" as const,
        front:       e.lemma,
        back:        `${e.gloss}${e.ipa ? `\n/${e.ipa}/` : ""}${e.partOfSpeech ? ` · ${e.partOfSpeech}` : ""}`,
        due:         newCard.due,
        stability:   newCard.stability,
        difficulty:  newCard.difficulty,
        state:       "NEW" as const,
        elapsedDays:   newCard.elapsed_days,
        scheduledDays: newCard.scheduled_days,
      },
      {
        enrollmentId,
        dictEntryId: e.id,
        cardType:    "VOCAB_PRODUCTION" as const,
        front:       e.gloss,
        back:        `${e.lemma}${e.ipa ? ` /${e.ipa}/` : ""}`,
        due:         newCard.due,
        stability:   newCard.stability,
        difficulty:  newCard.difficulty,
        state:       "NEW" as const,
        elapsedDays:   newCard.elapsed_days,
        scheduledDays: newCard.scheduled_days,
      },
    ]),
    skipDuplicates: true,
  })
}

async function getSlugForLanguage(languageId: string): Promise<string> {
  const lang = await prisma.language.findUnique({
    where: { id: languageId },
    select: { slug: true },
  })
  return lang?.slug ?? ""
}

// ─── State conversion helpers ─────────────────────────────────────────────────

function dbStateToFSRS(state: string): State {
  const map: Record<string, State> = {
    NEW: State.New, LEARNING: State.Learning, REVIEW: State.Review, RELEARNING: State.Relearning,
  }
  return map[state] ?? State.New
}

function fsrsStateToDb(s: State): "NEW" | "LEARNING" | "REVIEW" | "RELEARNING" {
  const map: Record<number, "NEW" | "LEARNING" | "REVIEW" | "RELEARNING"> = {
    [State.New]: "NEW", [State.Learning]: "LEARNING",
    [State.Review]: "REVIEW", [State.Relearning]: "RELEARNING",
  }
  return map[s] ?? "NEW"
}
