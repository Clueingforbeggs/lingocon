import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getDevUserId } from "@/lib/dev-auth"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Flame, Sparkles, BookOpen, GraduationCap, ArrowLeft, ArrowRight,
  Globe, Trophy, BookMarked, ListChecks, BarChart3, Users,
} from "lucide-react"
import { xpToNextLevel } from "@/lib/fsrs"
import { enrollInLanguage } from "@/app/actions/learn"
import { EnrollButton } from "./enroll-button"

export const dynamic = "force-dynamic"

async function getLanguageLearnData(slug: string, userId: string | null) {
  const language = await prisma.language.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, description: true, flagUrl: true, visibility: true,
      _count: {
        select: { dictionaryEntries: true, grammarPages: true, texts: true },
      },
    },
  })

  if (!language || language.visibility === "PRIVATE") return null

  const [courses, enrollment, learnerCount] = await Promise.all([
    prisma.course.findMany({
      where: { languageId: language.id, visibility: "PUBLISHED" },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { order: "asc" },
    }),
    userId
      ? prisma.enrollment.findUnique({
          where: { userId_languageId: { userId, languageId: language.id } },
        })
      : null,
    prisma.enrollment.count({ where: { languageId: language.id } }),
  ])

  return { language, courses, enrollment, learnerCount }
}

export default async function LearnLanguagePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()
  const isDevMode = process.env.DEV_MODE === "true"
  const userId = session?.user?.id || (isDevMode ? await getDevUserId() : null)

  const data = await getLanguageLearnData(slug, userId)
  if (!data) notFound()

  const { language, courses, enrollment, learnerCount } = data

  const levelInfo = enrollment ? xpToNextLevel(enrollment.xp) : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground -ml-2">
          <Link href="/learn">
            <ArrowLeft className="h-4 w-4" />
            My Learning
          </Link>
        </Button>
      </div>

      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            {language.flagUrl ? (
              <Image src={language.flagUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-7 w-7 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{language.name}</h1>
              {language.description && (
                <p className="text-muted-foreground mt-1 max-w-xl line-clamp-2">{language.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                <StatChip icon={<BookOpen className="h-3.5 w-3.5" />} label={`${language._count.dictionaryEntries} words`} />
                <StatChip icon={<BookMarked className="h-3.5 w-3.5" />} label={`${language._count.grammarPages} grammar pages`} />
                <StatChip icon={<Users className="h-3.5 w-3.5" />} label={`${learnerCount} learner${learnerCount !== 1 ? "s" : ""}`} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {enrollment ? (
              <Button asChild size="lg" className="gap-2 min-w-[160px]">
                <Link href={`/learn/${slug}/study`}>
                  <Sparkles className="h-4 w-4" />
                  Study Now
                </Link>
              </Button>
            ) : (
              <EnrollButton languageId={language.id} slug={slug} />
            )}
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href={`/lang/${slug}`}>
                <Globe className="h-3.5 w-3.5" />
                View Language
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress bar if enrolled */}
        {enrollment && levelInfo && (
          <div className="relative mt-6 p-4 rounded-2xl bg-background/60 border border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Level {levelInfo.level}
                </div>
                {enrollment.streak > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-500 font-medium">
                    <Flame className="h-4 w-4" />
                    {enrollment.streak}-day streak
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{enrollment.xp} XP total</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${levelInfo.percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {levelInfo.current}/{levelInfo.needed} XP to level {levelInfo.level + 1}
            </p>
          </div>
        )}
      </div>

      {/* Study modes */}
      {enrollment && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <ActionCard
            href={`/learn/${slug}/study`}
            icon={<Sparkles className="h-6 w-6 text-primary" />}
            title="Daily Study"
            description="Review due cards with spaced repetition"
            primary
          />
          <ActionCard
            href={`/learn/${slug}/progress`}
            icon={<BarChart3 className="h-6 w-6 text-accent-foreground" />}
            title="Progress"
            description="View your stats, streaks, and vocabulary growth"
          />
        </div>
      )}

      {/* Courses */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Courses
          </h2>
        </div>

        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No courses published yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                The language creator can add structured courses from the Studio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map(course => (
              <Card key={course.id} className="group hover:shadow-md hover:-translate-y-0.5 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <ListChecks className="h-3 w-3" />
                      {course._count.lessons} lessons
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {course._count.enrollments}
                    </Badge>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1 shrink-0">
                    <Link href={`/learn/${slug}/courses/${course.id}`}>
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
  )
}

function ActionCard({
  href, icon, title, description, primary,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  primary?: boolean
}) {
  return (
    <Link href={href}>
      <Card className={`group h-full hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${primary ? "border-primary/30 bg-primary/5" : ""}`}>
        <CardContent className="flex items-center gap-4 pt-5 pb-5">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${primary ? "bg-primary/15" : "bg-secondary"}`}>
            {icon}
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  )
}
