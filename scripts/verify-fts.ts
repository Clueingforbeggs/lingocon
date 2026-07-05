// Manual live check for the FTS service against the local DB:
//   npx tsx scripts/verify-fts.ts water
import "dotenv/config"
import { searchFts } from "../lib/services/search-fts"
import { prisma } from "../lib/prisma"

async function main() {
  const query = process.argv[2] ?? "water"
  const result = await searchFts(query)
  console.log(`Query: "${query}"`)
  console.log(`  languages: ${result.languages.length}`, result.languages.map((l) => l.name))
  console.log(`  entries:   ${result.entries.length}`, result.entries.map((e) => `${e.lemma} (${e.gloss})`))
  console.log(`  grammar:   ${result.grammarPages.length}`)
  console.log(`  articles:  ${result.articles.length}`)
  console.log(`  texts:     ${result.texts.length}`)
  await prisma.$disconnect()
}

void main()
