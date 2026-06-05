import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getDevUserId } from "@/lib/dev-auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, ListChecks, Play, Users } from "lucide-react"
import { EnrollButton } from "../../enroll-button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

async function getCourseData(courseId: string, userId: string | null) {
  const course = await prisma.course.findUnique({
    where: { id: courseId, visibility: "PUBLISHED" },
    include: {
      language: { select: { id: true, name: true, slug: true } },
      author:   { select: { id: true, name: true, image: true } },
      lessons: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              dictEntry:   { select: { id: true, lemma: true, gloss: true, partOfSpeech: true } },
              grammarPage: { select: { id: true, title: true, slug: true } },
              text:        { select: { id: true, title: true, type: true } },
              sentence:    { select: { id: true, sentence: true, translation: true } },
            },
          },
          _count: { select: { items: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  })

  if (!course) return null

  const enrollment = userId
    ? await prisma.enrollment.findUnique({
        where: { userId_languageId: { userId, languageId: course.language.id } },
      })
    : null

  // Fetch which lessons this user has already completed
  const completions = userId
    ? await prisma.lessonCompletion.findMany({
        where: { userId, lessonId: { in: course.lessons.map(l => l.id) } },
        select: { lessonId: true, heartsLeft: true },
      })
    : []
  const completedLessonIds = new Set(completions.map(c => c.lessonId))

  return { course, enrollment, completedLessonIds }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>
}) {
  const { slug, courseId } = await params
  const session = await auth()
  const isDevMode = process.env.DEV_MODE === "true"
  const userId = session?.user?.id || (isDevMode ? await getDevUserId() : null)

  const data = await getCourseData(courseId, userId)
  if (!data) notFound()

  const { course, enrollment, completedLessonIds } = data
  const totalItems = course.lessons.reduce((s, l) => s + l._count.items, 0)
  const completedCount = completedLessonIds.size

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground -ml-2">
          <Link href={`/learn/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
            {course.language.name}
          </Link>
        </Button>
      </div>

      {/* Course header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Course · {course.language.name}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground max-w-xl">{course.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <InfoChip icon={<ListChecks className="h-3.5 w-3.5" />} label={`${course.lessons.length} lessons`} />
              <InfoChip icon={<BookOpen className="h-3.5 w-3.5" />} label={`${totalItems} items`} />
              <InfoChip icon={<Users className="h-3.5 w-3.5" />} label={`${course._count.enrollments} learners`} />
            </div>
          </div>
          <div className="shrink-0">
            {enrollment ? (
              <Button asChild size="lg" className="gap-2">
                <Link href={`/learn/${slug}/study`}>Start Studying</Link>
              </Button>
            ) : (
              <EnrollButton languageId={course.language.id} slug={slug} />
            )}
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lessons</h2>
            {enrollment && course.lessons.length > 0 && (
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round((completedCount / course.lessons.length) * 100)}% completed
              </span>
            )}
          </div>
          {enrollment && course.lessons.length > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(completedCount / course.lessons.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {course.lessons.map((lesson, i) => {
          const isDone = completedLessonIds.has(lesson.id)
          const hasVocab = lesson.items.some(item => item.type === "VOCAB")

          return (
            <Card key={lesson.id} className={cn(
              "overflow-hidden transition-all duration-200",
              isDone ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10" : "hover:border-primary/30"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {/* Number / done indicator */}
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                    isDone
                      ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"
                      : "bg-primary/10 text-primary"
                  )}>
                    {isDone
                      ? <CheckCircle2 className="h-5 w-5" />
                      : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{lesson.title}</CardTitle>
                    {lesson.description && (
                      <CardDescription className="text-xs">{lesson.description}</CardDescription>
                    )}
                  </div>

                  {/* Start / Review button */}
                  {enrollment && hasVocab ? (
                    <Button
                      asChild
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      className="shrink-0 gap-1.5"
                    >
                      <Link href={`/learn/${slug}/lesson/${lesson.id}`}>
                        <Play className="h-3.5 w-3.5" />
                        {isDone ? "Review" : "Start"}
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {lesson._count.items} items
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {lesson.items.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {lesson.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary/50 text-sm">
                        <ItemTypeIcon type={item.type} />
                        <span className="truncate">
                          {item.type === "VOCAB" && item.dictEntry
                            ? <><strong>{item.dictEntry.lemma}</strong> — {item.dictEntry.gloss}</>
                            : item.type === "GRAMMAR" && item.grammarPage
                            ? item.grammarPage.title
                            : item.type === "TEXT" && item.text
                            ? item.text.title
                            : item.type === "SENTENCE" && item.sentence
                            ? <em>{item.sentence.sentence}</em>
                            : "Item"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
  )
}

function ItemTypeIcon({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    VOCAB:    { label: "W", color: "bg-primary/10 text-primary" },
    GRAMMAR:  { label: "G", color: "bg-amber-500/10 text-amber-600" },
    TEXT:     { label: "T", color: "bg-blue-500/10 text-blue-600" },
    SENTENCE: { label: "S", color: "bg-emerald-500/10 text-emerald-600" },
  }
  const { label, color } = map[type] ?? { label: "?", color: "bg-secondary" }
  return (
    <span className={`h-5 w-5 rounded text-xs font-bold flex items-center justify-center shrink-0 ${color}`}>
      {label}
    </span>
  )
}
