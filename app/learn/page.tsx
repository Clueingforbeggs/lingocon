import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDevUserId } from "@/lib/dev-auth"
import { prisma } from "@/lib/prisma"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Flame, Sparkles, Trophy, GraduationCap, ArrowRight, Globe, Plus } from "lucide-react"
import { xpToNextLevel } from "@/lib/fsrs"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "My Learning — LingoCon",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function getLearnDashboardData(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      language: { select: { id: true, name: true, slug: true, flagUrl: true } },
      course:   { select: { id: true, title: true } },
    },
    orderBy: { lastStudied: "desc" },
  })

  const now = new Date()
  const dueCounts = await prisma.studyCard.groupBy({
    by: ["enrollmentId"],
    where: {
      enrollmentId: { in: enrollments.map(e => e.id) },
      due: { lte: now },
    },
    _count: true,
  })
  const dueByEnrollment = new Map(dueCounts.map(d => [d.enrollmentId, d._count]))

  return enrollments.map(e => ({
    ...e,
    dueCount: dueByEnrollment.get(e.id) ?? 0,
    levelInfo: xpToNextLevel(e.xp),
  }))
}

export default async function LearnDashboardPage() {
  const session = await auth()
  const isDevMode = process.env.DEV_MODE === "true"

  if (!session?.user?.id && !isDevMode) redirect("/login?callbackUrl=/learn")

  const userId = session?.user?.id || (await getDevUserId())
  const enrollments = await getLearnDashboardData(userId)

  const totalXP = enrollments.reduce((s, e) => s + e.xp, 0)
  const totalStreak = Math.max(...enrollments.map(e => e.streak), 0)
  const totalDue = enrollments.reduce((s, e) => s + e.dueCount, 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-primary">My Learning</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Your Language Journey</h1>
            <p className="text-muted-foreground mt-1">
              {enrollments.length === 0
                ? "Enroll in a language to start learning"
                : `${enrollments.length} language${enrollments.length !== 1 ? "s" : ""} · ${totalDue} cards due today`}
            </p>
          </div>
          <Button asChild size="lg" className="gap-2 shrink-0">
            <Link href="/browse">
              <Plus className="h-4 w-4" />
              Find a Language
            </Link>
          </Button>
        </div>

        {enrollments.length > 0 && (
          <div className="relative mt-6 flex flex-wrap gap-4">
            <StatPill icon={<Flame className="h-4 w-4 text-amber-500" />} label="Best Streak" value={`${totalStreak} days`} />
            <StatPill icon={<Trophy className="h-4 w-4 text-amber-400" />} label="Total XP" value={totalXP.toLocaleString()} />
            <StatPill icon={<BookOpen className="h-4 w-4 text-primary" />} label="Due Today" value={totalDue.toString()} />
          </div>
        )}
      </div>

      {/* Enrolled languages */}
      {enrollments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map(e => (
            <EnrollmentCard key={e.id} enrollment={e} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function EnrollmentCard({ enrollment }: { enrollment: Awaited<ReturnType<typeof getLearnDashboardData>>[number] }) {
  const { language, dueCount, streak, levelInfo, course } = enrollment
  const hasDue = dueCount > 0

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
      hasDue && "border-primary/30"
    )}>
      {hasDue && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {language.flagUrl ? (
              <Image src={language.flagUrl} alt="" width={32} height={32} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{language.name}</CardTitle>
              {course && (
                <p className="text-xs text-muted-foreground">{course.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {streak > 0 && (
              <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400">
                <Flame className="h-3 w-3" />
                {streak}
              </Badge>
            )}
            {hasDue && (
              <Badge className="gap-1">
                {dueCount} due
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XP progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Level {levelInfo.level}</span>
            <span>{levelInfo.current}/{levelInfo.needed} XP</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${levelInfo.percent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1 gap-2" size="sm">
            <Link href={`/learn/${language.slug}/study`}>
              <Sparkles className="h-3.5 w-3.5" />
              {hasDue ? `Study (${dueCount})` : "Study"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/learn/${language.slug}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <GraduationCap className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No languages yet</h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        Browse the community&apos;s constructed languages and start learning one today.
      </p>
      <Button asChild size="lg" className="gap-2">
        <Link href="/browse">
          <Globe className="h-4 w-4" />
          Browse Languages
        </Link>
      </Button>
    </div>
  )
}
