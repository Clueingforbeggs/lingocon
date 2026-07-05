import { prisma } from "@/lib/prisma"
import type { SearchResult, SearchScope } from "@/lib/services/search"

const SIMILARITY_THRESHOLD = 0.3

const EMPTY: SearchResult = { languages: [], entries: [], grammarPages: [], articles: [], texts: [] }

interface EntryRow {
  id: string
  lemma: string
  gloss: string
  ipa: string | null
  languageId: string
  languageName: string
  languageSlug: string
  languageFontFamily: string | null
}

interface LanguageRow {
  id: string
  name: string
  slug: string
  description: string | null
  flagUrl: string | null
  ownerName: string | null
  ownerImage: string | null
  scriptSymbols: number
  grammarPages: number
  dictionaryEntries: number
}

interface TitledRow {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  description?: string | null
  type?: string
  languageId: string
  languageName: string
  languageSlug: string
  languageFontFamily?: string | null
}

function shapeEntry(row: EntryRow): SearchResult["entries"][number] {
  return {
    id: row.id,
    lemma: row.lemma,
    gloss: row.gloss,
    ipa: row.ipa,
    language: {
      id: row.languageId,
      name: row.languageName,
      slug: row.languageSlug,
      fontFamily: row.languageFontFamily,
    },
  }
}

async function searchLanguages(query: string, limit: number): Promise<SearchResult["languages"]> {
  const rows = await prisma.$queryRaw<LanguageRow[]>`
    SELECT l."id", l."name", l."slug", l."description", l."flagUrl",
           u."name" AS "ownerName", u."image" AS "ownerImage",
           (SELECT count(*)::int FROM "script_symbols" s WHERE s."languageId" = l."id") AS "scriptSymbols",
           (SELECT count(*)::int FROM "grammar_pages" g WHERE g."languageId" = l."id") AS "grammarPages",
           (SELECT count(*)::int FROM "dictionary_entries" d WHERE d."languageId" = l."id") AS "dictionaryEntries"
    FROM "languages" l
    JOIN "users" u ON u."id" = l."ownerId"
    WHERE l."visibility" = 'PUBLIC'
      AND l."searchVector" @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(l."searchVector", websearch_to_tsquery('simple', ${query})) DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    flagUrl: row.flagUrl,
    owner: { name: row.ownerName, image: row.ownerImage },
    _count: {
      scriptSymbols: row.scriptSymbols,
      grammarPages: row.grammarPages,
      dictionaryEntries: row.dictionaryEntries,
    },
  }))
}

async function searchEntries(query: string, limit: number): Promise<SearchResult["entries"]> {
  const ftsRows = await prisma.$queryRaw<EntryRow[]>`
    SELECT e."id", e."lemma", e."gloss", e."ipa",
           l."id" AS "languageId", l."name" AS "languageName", l."slug" AS "languageSlug",
           l."fontFamily" AS "languageFontFamily"
    FROM "dictionary_entries" e
    JOIN "languages" l ON l."id" = e."languageId"
    WHERE l."visibility" = 'PUBLIC'
      AND e."searchVector" @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(e."searchVector", websearch_to_tsquery('simple', ${query})) DESC
    LIMIT ${limit}
  `
  if (ftsRows.length > 0) return ftsRows.map(shapeEntry)

  // Typo-tolerant fallback: trigram similarity on lemma/ipa only (the columns
  // with gin_trgm_ops indexes). Deliberately excludes gloss — fuzzy matching
  // targets unfamiliar conlang spellings, not native-language glosses. The 0.3
  // threshold is strict for very short lemmas (e.g. similarity('vand','vnd')≈0.29
  // misses); Wave 1 may adopt a length-adjusted threshold.
  const fuzzyRows = await prisma.$queryRaw<EntryRow[]>`
    SELECT e."id", e."lemma", e."gloss", e."ipa",
           l."id" AS "languageId", l."name" AS "languageName", l."slug" AS "languageSlug",
           l."fontFamily" AS "languageFontFamily"
    FROM "dictionary_entries" e
    JOIN "languages" l ON l."id" = e."languageId"
    WHERE l."visibility" = 'PUBLIC'
      AND greatest(similarity(e."lemma", ${query}), similarity(coalesce(e."ipa", ''), ${query})) > ${SIMILARITY_THRESHOLD}
    ORDER BY greatest(similarity(e."lemma", ${query}), similarity(coalesce(e."ipa", ''), ${query})) DESC
    LIMIT ${limit}
  `
  return fuzzyRows.map(shapeEntry)
}

async function searchGrammarPages(query: string, limit: number): Promise<SearchResult["grammarPages"]> {
  const rows = await prisma.$queryRaw<TitledRow[]>`
    SELECT g."id", g."title", g."slug",
           l."id" AS "languageId", l."name" AS "languageName", l."slug" AS "languageSlug",
           l."fontFamily" AS "languageFontFamily"
    FROM "grammar_pages" g
    JOIN "languages" l ON l."id" = g."languageId"
    WHERE l."visibility" = 'PUBLIC'
      AND g."searchVector" @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(g."searchVector", websearch_to_tsquery('simple', ${query})) DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    language: {
      id: row.languageId,
      name: row.languageName,
      slug: row.languageSlug,
      fontFamily: row.languageFontFamily ?? null,
    },
  }))
}

async function searchArticles(query: string, limit: number): Promise<SearchResult["articles"]> {
  const rows = await prisma.$queryRaw<TitledRow[]>`
    SELECT a."id", a."title", a."slug", a."excerpt",
           l."id" AS "languageId", l."name" AS "languageName", l."slug" AS "languageSlug"
    FROM "articles" a
    JOIN "languages" l ON l."id" = a."languageId"
    WHERE a."published" = true
      AND l."visibility" = 'PUBLIC'
      AND a."searchVector" @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(a."searchVector", websearch_to_tsquery('simple', ${query})) DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    language: { id: row.languageId, name: row.languageName, slug: row.languageSlug },
  }))
}

async function searchTexts(query: string, limit: number): Promise<SearchResult["texts"]> {
  const rows = await prisma.$queryRaw<TitledRow[]>`
    SELECT t."id", t."title", t."slug", t."description", t."type"::text AS "type",
           l."id" AS "languageId", l."name" AS "languageName", l."slug" AS "languageSlug"
    FROM "texts" t
    JOIN "languages" l ON l."id" = t."languageId"
    WHERE t."published" = true
      AND l."visibility" = 'PUBLIC'
      AND t."searchVector" @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(t."searchVector", websearch_to_tsquery('simple', ${query})) DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? null,
    type: row.type ?? "",
    language: { id: row.languageId, name: row.languageName, slug: row.languageSlug },
  }))
}

export async function searchFts(query: string, scope: SearchScope = "all"): Promise<SearchResult> {
  if (!query || query.length < 2) return EMPTY

  const [languages, entries, grammarPages, articles, texts] = await Promise.all([
    scope === "all" || scope === "languages" ? searchLanguages(query, scope === "languages" ? 50 : 5) : [],
    scope === "all" || scope === "dictionary" ? searchEntries(query, scope === "dictionary" ? 50 : 10) : [],
    scope === "all" || scope === "grammar" ? searchGrammarPages(query, scope === "grammar" ? 50 : 10) : [],
    scope === "all" || scope === "articles" ? searchArticles(query, scope === "articles" ? 50 : 5) : [],
    scope === "all" || scope === "texts" ? searchTexts(query, scope === "texts" ? 50 : 5) : [],
  ])

  return { languages, entries, grammarPages, articles, texts }
}
