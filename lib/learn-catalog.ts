import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * A language that can actually be learned: it is public AND has at least one
 * published course. This is the unit shown in the course catalog (`/learn/browse`).
 */
export interface LearnableLanguage {
  id: string
  name: string
  slug: string
  description: string | null
  flagUrl: string | null
  owner: { name: string | null; image: string | null }
  courseCount: number
  lessonCount: number
  learnerCount: number
  entryCount: number
}

function buildWhere(search: string) {
  const base = {
    visibility: "PUBLIC" as const,
    courses: { some: { visibility: "PUBLISHED" as const } },
  }
  if (!search.trim()) return base
  return {
    ...base,
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ],
  }
}

export async function countLearnableLanguages(search = ""): Promise<number> {
  return prisma.language.count({ where: buildWhere(search) })
}

export async function getLearnableLanguages({
  search = "",
  take = 24,
  skip = 0,
  excludeLanguageIds = [],
}: {
  search?: string
  take?: number
  skip?: number
  excludeLanguageIds?: string[]
} = {}): Promise<LearnableLanguage[]> {
  const where = buildWhere(search)

  const languages = await prisma.language.findMany({
    where: excludeLanguageIds.length
      ? { ...where, id: { notIn: excludeLanguageIds } }
      : where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      flagUrl: true,
      owner: { select: { name: true, image: true } },
      _count: { select: { enrollments: true, dictionaryEntries: true } },
      courses: {
        where: { visibility: "PUBLISHED" },
        select: { _count: { select: { lessons: true } } },
      },
    },
    orderBy: [{ enrollments: { _count: "desc" } }, { updatedAt: "desc" }],
    take,
    skip,
  })

  return languages.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    description: l.description,
    flagUrl: l.flagUrl,
    owner: l.owner,
    courseCount: l.courses.length,
    lessonCount: l.courses.reduce((sum, c) => sum + c._count.lessons, 0),
    learnerCount: l._count.enrollments,
    entryCount: l._count.dictionaryEntries,
  }))
}
