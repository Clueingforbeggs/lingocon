import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getDevUserId } from "@/lib/dev-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Flame, Trophy, BookOpen, BarChart3, Target, Zap, TrendingUp } from "lucide-react"
import { xpToNextLevel } from "@/lib/fsrs"

export const dynamic = "force-dynamic"

async function getProgressData(slug: string, userId: string) {
  const language = await prisma.language.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, visibility: true },
  })
  if (!language || language.visibility === "PRIVATE") return null

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_languageId: { userId, languageId: language.id } },
  })
  if (!enrollment) return { language, enrollment: null }

  const now = new Date()

  // Card state distribution
  const stateCounts = await prisma.studyCard.groupBy({
    by: ["state"],
    where: { enrollmentId: enrollment.id },
    _count: true,
  })

  // Total reviews
  const totalReviews = await prisma.cardReview.count({
    where: { card: { enrollmentId: enrollment.id } },
  })

  // Reviews this week
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const reviewsThisWeek = await prisma.cardReview.count({
    where: {
      card: { enrollmentId: enrollment.id },
      reviewedAt: { gte: weekAgo },
    },
  })

  // Daily review counts for last 30 days (for heatmap-style display)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const dailyReviews = await prisma.cardReview.findMany({
    where: {
      card: { enrollmentId: enrollment.id },
      reviewedAt: { gte: thirtyDaysAgo },
    },
    select: { reviewedAt: true, xpEarned: true },
    orderBy: { reviewedAt: "asc" },
  })

  // Aggregate by day
  const dayMap = new Map<string, { reviews: number; xp: number }>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    dayMap.set(d.toISOString().slice(0, 10), { reviews: 0, xp: 0 })
  }
  for (const r of dailyReviews) {
    const key = r.reviewedAt.toISOString().slice(0, 10)
    const existing = dayMap.get(key)
    if (existing) {
      existing.reviews += 1
      existing.xp += r.xpEarned
    }
  }

  const states = Object.fromEntries(stateCounts.map(s => [s.state, s._count]))
  const totalCards = Object.values(states).reduce((a, b) => a + b, 0)

  return {
    language,
    enrollment,
    stats: {
      totalCards,
      states: {
        new:        states["NEW"]        ?? 0,
        learning:   states["LEARNING"]   ?? 0,
        review:     states["REVIEW"]     ?? 0,
        relearning: states["RELEARNING"] ?? 0,
      },
      totalReviews,
      reviewsThisWeek,
    },
    activityGrid: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
  }
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()
  const isDevMode = process.env.DEV_MODE === "true"
  if (!session?.user?.id && !isDevMode) redirect(`/login?callbackUrl=/learn/${slug}/progress`)

  const userId = session?.user?.id || (await getDevUserId())
  const data = await getProgressData(slug, userId)
  if (!data) notFound()

  const { language, enrollment, stats, activityGrid } = data
  if (!enrollment || !stats) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <p className="text-muted-foreground">Not enrolled in this language yet.</p>
        <Button asChild className="mt-4">
          <Link href={`/learn/${slug}`}>Go Back</Link>
        </Button>
      </div>
    )
  }

  const levelInfo = xpToNextLevel(enrollment.xp)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground -ml-2">
          <Link href={`/learn/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
            {language.name}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        Your Progress in {language.name}
      </h1>

      {/* Level & XP */}
      <Card className="mb-6">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <div className="text-xl font-bold">Level {levelInfo.level}</div>
                <div className="text-sm text-muted-foreground">{enrollment.xp.toLocaleString()} total XP</div>
              </div>
            </div>
            {enrollment.streak > 0 && (
              <div className="flex items-center gap-2 text-amber-500 font-semibold">
                <Flame className="h-5 w-5" />
                {enrollment.streak}-day streak
              </div>
            )}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
              style={{ width: `${levelInfo.percent}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>{levelInfo.current} XP</span>
            <span>{levelInfo.needed} XP to level {levelInfo.level + 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} value={stats.totalCards} label="Total Cards" />
        <StatCard icon={<Target className="h-5 w-5 text-emerald-500" />} value={stats.totalReviews} label="Total Reviews" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-500" />} value={stats.reviewsThisWeek} label="This Week" />
        <StatCard icon={<Zap className="h-5 w-5 text-amber-500" />} value={enrollment.xp} label="XP Earned" />
      </div>

      {/* Card state breakdown */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Card States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            ["New",        stats.states.new,        "bg-secondary text-muted-foreground"],
            ["Learning",   stats.states.learning,   "bg-blue-500/15 text-blue-600 dark:text-blue-400"],
            ["Review",     stats.states.review,     "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"],
            ["Relearning", stats.states.relearning,  "bg-orange-500/15 text-orange-600 dark:text-orange-400"],
          ] as [string, number, string][]).map(([label, count, cls]) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={cls} variant="secondary">{label}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 sm:w-48 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: stats.totalCards > 0 ? `${(count / stats.totalCards) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 30-day activity */}
      {activityGrid && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">30-Day Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {activityGrid.map(({ date, reviews }) => {
                const intensity =
                  reviews === 0 ? 0
                  : reviews < 5 ? 1
                  : reviews < 15 ? 2
                  : reviews < 30 ? 3
                  : 4
                return (
                  <div
                    key={date}
                    title={`${date}: ${reviews} reviews`}
                    className={cn(
                      "h-5 w-5 rounded-sm transition-colors",
                      intensity === 0 ? "bg-secondary"
                      : intensity === 1 ? "bg-emerald-200 dark:bg-emerald-900"
                      : intensity === 2 ? "bg-emerald-400 dark:bg-emerald-700"
                      : intensity === 3 ? "bg-emerald-500 dark:bg-emerald-500"
                      : "bg-emerald-600 dark:bg-emerald-400"
                    )}
                  />
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Each square = one day. Darker = more reviews.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-2">
        {icon}
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
