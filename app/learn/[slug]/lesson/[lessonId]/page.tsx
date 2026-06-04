import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getDevUserId } from "@/lib/dev-auth"
import { notFound, redirect } from "next/navigation"
import { generateExercises } from "@/lib/lesson-generator"
import { LessonEngine } from "./lesson-engine"
import type { VocabItem } from "@/lib/lesson-generator"

export const dynamic = "force-dynamic"

async function getLessonData(lessonId: string, userId: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          visibility: true,
          language: { select: { id: true, name: true, slug: true } },
        },
      },
      items: {
        orderBy: { order: "asc" },
        include: {
          dictEntry: {
            select: { id: true, lemma: true, gloss: true, ipa: true, partOfSpeech: true },
          },
        },
      },
    },
  })

  if (!lesson || lesson.course.visibility !== "PUBLISHED") return null

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_languageId: { userId, languageId: lesson.course.language.id },
    },
  })
  if (!enrollment) return { lesson, enrollment: null }

  const completion = await prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  })

  return { lesson, enrollment, completion }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const session = await auth()
  const isDevMode = process.env.DEV_MODE === "true"

  if (!session?.user?.id && !isDevMode) {
    redirect(`/login?callbackUrl=/learn/${slug}/lesson/${lessonId}`)
  }

  const userId = session?.user?.id || (await getDevUserId())
  const data = await getLessonData(lessonId, userId)

  if (!data) notFound()

  const { lesson, enrollment } = data

  if (!enrollment) {
    redirect(`/learn/${slug}`)
  }

  // Extract vocab items from lesson items
  const vocabItems: VocabItem[] = lesson.items
    .filter(item => item.type === "VOCAB" && item.dictEntry)
    .map(item => item.dictEntry!)

  if (vocabItems.length === 0) {
    redirect(`/learn/${slug}/courses/${lesson.course.id}`)
  }

  const exercises = generateExercises(vocabItems)

  return (
    <div className="min-h-screen bg-background">
      <LessonEngine
        lessonId={lessonId}
        lessonTitle={lesson.title}
        exercises={exercises}
        languageSlug={slug}
        languageName={lesson.course.language.name}
        courseId={lesson.course.id}
      />
    </div>
  )
}
