# Wave 0: Shared Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three pieces of infrastructure every later wave depends on: a PM2 cron worker with a DB-backed job queue, a Postgres full-text-search foundation (tsvector + pg_trgm), and a shared upload-validation library.

**Architecture:** A `Job` table + pure queue functions in `lib/jobs/` polled by a single-instance PM2 app (`scripts/worker.ts`). FTS uses generated `tsvector` STORED columns (config `simple` — no English stemming, correct for conlang lemmas) with GIN indexes, exposed through `lib/services/search-fts.ts` that returns the exact same `SearchResult` shape as the existing `lib/services/search.ts` (the UI swap happens in Wave 1). Upload validation is extracted from `app/api/upload/route.ts` into pure functions in `lib/uploads.ts` with per-type size caps.

**Tech Stack:** Prisma/Postgres (`Unsupported("tsvector")` + hand-edited `--create-only` migrations), node-cron + tsx worker under PM2, vitest with the codebase's `vi.hoisted` prisma-mock pattern.

**Parent plan:** `docs/superpowers/plans/2026-07-03-lingocon-master-roadmap.md` (Wave 0).

**Conventions (from the codebase — follow them):**
- 2-space indent, no semicolons, double quotes.
- Unit tests live in `__tests__/` next to the module; prisma is mocked via the `vi.hoisted` pattern (see `lib/__tests__/notifications.test.ts`).
- Baseline test count is 211 — the suite only ever grows.
- No user-facing UI strings in this wave → no i18n changes needed.

---

### Task 0: Branch setup

The main checkout has the user's uncommitted UI work in `app/learn/` — do not touch or commit those files.

- [ ] **Step 1: Create branch from main**

```bash
cd /Users/oleksandrchepkov/Documents/langua
git checkout -b wave0-shared-infra main
```

(If executing in an isolated worktree via superpowers:using-git-worktrees, create the worktree from `main` with this branch name instead.)

- [ ] **Step 2: Install new dependencies**

```bash
npm install node-cron dotenv && npm install -D @types/node-cron
```

- [ ] **Step 3: Verify baseline is green**

Run: `npm test -- --run 2>&1 | tail -5`
Expected: 211 tests passing, 0 failures.

- [ ] **Step 4: Commit the dependency change**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add node-cron and dotenv for the background worker"
```

---

### Task 1: Job model + migration

**Files:**
- Modify: `prisma/schema.prisma` (append after the `LessonCompletion` model at the end)

- [ ] **Step 1: Add the Job model to the schema**

```prisma
// Background job queue processed by scripts/worker.ts (PM2 app "lingocon-worker").
// A job is claimable when startedAt is null, runAfter has passed, and attempts
// remain. Failed jobs release their claim with a backoff; after MAX_ATTEMPTS
// they stay visible (finishedAt null, error set) for inspection.
model Job {
  id         String    @id @default(cuid())
  type       String    // 'heartbeat' | 'league_rollover' | 'inflection_regen' | ...
  payload    Json      @default("{}")
  runAfter   DateTime  @default(now())
  startedAt  DateTime?
  finishedAt DateTime?
  error      String?   @db.Text
  attempts   Int       @default(0)
  createdAt  DateTime  @default(now())

  @@index([startedAt, runAfter])
  @@map("jobs")
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_job_queue`
Expected: migration `<timestamp>_add_job_queue` created and applied; `prisma generate` runs.

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit && npm test -- --run 2>&1 | tail -3`
Expected: clean tsc, 211 tests pass.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(jobs): add Job model for the background queue"
```

---

### Task 2: Job queue library (TDD)

**Files:**
- Create: `lib/jobs/queue.ts`
- Test: `lib/jobs/__tests__/queue.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    job: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

import { enqueueJob, claimNextJob, completeJob, failJob, MAX_ATTEMPTS, RETRY_BACKOFF_MS } from "@/lib/jobs/queue"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("enqueueJob", () => {
  it("creates a job due immediately by default", async () => {
    mockPrisma.job.create.mockResolvedValueOnce({ id: "j1" })
    await enqueueJob("heartbeat")
    const arg = mockPrisma.job.create.mock.calls[0][0]
    expect(arg.data.type).toBe("heartbeat")
    expect(arg.data.payload).toEqual({})
    expect(arg.data.runAfter).toBeInstanceOf(Date)
  })

  it("passes payload and a future runAfter through", async () => {
    mockPrisma.job.create.mockResolvedValueOnce({ id: "j2" })
    const later = new Date(Date.now() + 60_000)
    await enqueueJob("league_rollover", { week: "2026-07-06" }, { runAfter: later })
    const arg = mockPrisma.job.create.mock.calls[0][0]
    expect(arg.data.payload).toEqual({ week: "2026-07-06" })
    expect(arg.data.runAfter).toBe(later)
  })
})

describe("claimNextJob", () => {
  it("returns null when no job is due", async () => {
    mockPrisma.job.findFirst.mockResolvedValueOnce(null)
    expect(await claimNextJob()).toBeNull()
  })

  it("claims the oldest due job via a conditional update", async () => {
    const job = { id: "j1", type: "heartbeat", payload: {}, attempts: 0 }
    mockPrisma.job.findFirst.mockResolvedValueOnce(job)
    mockPrisma.job.updateMany.mockResolvedValueOnce({ count: 1 })
    const claimed = await claimNextJob()
    expect(claimed).toEqual(job)
    const where = mockPrisma.job.updateMany.mock.calls[0][0].where
    expect(where).toEqual({ id: "j1", startedAt: null })
  })

  it("retries the next candidate when another worker won the race", async () => {
    const lost = { id: "j1", type: "a", payload: {}, attempts: 0 }
    const won = { id: "j2", type: "b", payload: {}, attempts: 0 }
    mockPrisma.job.findFirst.mockResolvedValueOnce(lost).mockResolvedValueOnce(won)
    mockPrisma.job.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
    const claimed = await claimNextJob()
    expect(claimed?.id).toBe("j2")
  })

  it("only considers jobs with remaining attempts", async () => {
    mockPrisma.job.findFirst.mockResolvedValueOnce(null)
    await claimNextJob()
    const where = mockPrisma.job.findFirst.mock.calls[0][0].where
    expect(where.attempts).toEqual({ lt: MAX_ATTEMPTS })
    expect(where.startedAt).toBeNull()
  })
})

describe("completeJob", () => {
  it("stamps finishedAt and clears any previous error", async () => {
    await completeJob("j1")
    const arg = mockPrisma.job.update.mock.calls[0][0]
    expect(arg.where).toEqual({ id: "j1" })
    expect(arg.data.finishedAt).toBeInstanceOf(Date)
    expect(arg.data.error).toBeNull()
  })
})

describe("failJob", () => {
  it("records the error, releases the claim, and backs off by attempts", async () => {
    const now = new Date("2026-07-03T12:00:00Z")
    mockPrisma.job.findUnique.mockResolvedValueOnce({ id: "j1", attempts: 2 })
    await failJob("j1", new Error("boom"), now)
    const arg = mockPrisma.job.update.mock.calls[0][0]
    expect(arg.data.error).toBe("boom")
    expect(arg.data.startedAt).toBeNull()
    expect(arg.data.runAfter).toEqual(new Date(now.getTime() + RETRY_BACKOFF_MS * 2))
  })

  it("stringifies non-Error throwables", async () => {
    mockPrisma.job.findUnique.mockResolvedValueOnce({ id: "j1", attempts: 1 })
    await failJob("j1", "string failure")
    expect(mockPrisma.job.update.mock.calls[0][0].data.error).toBe("string failure")
  })

  it("is a no-op when the job vanished", async () => {
    mockPrisma.job.findUnique.mockResolvedValueOnce(null)
    await failJob("gone", new Error("x"))
    expect(mockPrisma.job.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run lib/jobs 2>&1 | tail -5`
Expected: FAIL — cannot resolve `@/lib/jobs/queue`.

- [ ] **Step 3: Implement the queue**

```typescript
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const MAX_ATTEMPTS = 3
export const RETRY_BACKOFF_MS = 5 * 60 * 1000
const CLAIM_RACE_RETRIES = 5

export interface EnqueueOptions {
  runAfter?: Date
}

export async function enqueueJob(
  type: string,
  payload: Prisma.InputJsonObject = {},
  options: EnqueueOptions = {},
) {
  return prisma.job.create({
    data: { type, payload, runAfter: options.runAfter ?? new Date() },
  })
}

// Claim the oldest due job. The conditional updateMany IS the lock: if another
// worker claimed the candidate first, count is 0 and we try the next one.
export async function claimNextJob(now: Date = new Date()) {
  for (let attempt = 0; attempt < CLAIM_RACE_RETRIES; attempt++) {
    const candidate = await prisma.job.findFirst({
      where: {
        startedAt: null,
        runAfter: { lte: now },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { runAfter: "asc" },
    })
    if (!candidate) return null

    const claimed = await prisma.job.updateMany({
      where: { id: candidate.id, startedAt: null },
      data: { startedAt: now, attempts: { increment: 1 } },
    })
    if (claimed.count === 1) return candidate
  }
  return null
}

export async function completeJob(id: string) {
  await prisma.job.update({
    where: { id },
    data: { finishedAt: new Date(), error: null },
  })
}

// Failed jobs release the claim and back off linearly by attempt count. Once
// attempts reach MAX_ATTEMPTS they are no longer claimable but stay in the
// table (finishedAt null, error set) for inspection.
export async function failJob(id: string, error: unknown, now: Date = new Date()) {
  const message = error instanceof Error ? error.message : String(error)
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return
  await prisma.job.update({
    where: { id },
    data: {
      error: message.slice(0, 2000),
      startedAt: null,
      runAfter: new Date(now.getTime() + RETRY_BACKOFF_MS * job.attempts),
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run lib/jobs 2>&1 | tail -5`
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/jobs
git commit -m "feat(jobs): queue primitives — enqueue, optimistic claim, complete, fail with backoff"
```

---

### Task 3: Handler registry (TDD)

**Files:**
- Create: `lib/jobs/handlers.ts`
- Test: `lib/jobs/__tests__/handlers.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { registerHandler, getHandler, clearHandlers, registerBuiltinHandlers } from "@/lib/jobs/handlers"

beforeEach(() => {
  clearHandlers()
})

describe("handler registry", () => {
  it("registers and retrieves a handler", () => {
    const handler = async () => {}
    registerHandler("league_rollover", handler)
    expect(getHandler("league_rollover")).toBe(handler)
  })

  it("returns null for unknown types", () => {
    expect(getHandler("nope")).toBeNull()
  })

  it("throws on duplicate registration to catch wiring mistakes", () => {
    registerHandler("x", async () => {})
    expect(() => registerHandler("x", async () => {})).toThrow(/already registered/)
  })

  it("registers the heartbeat builtin", async () => {
    registerBuiltinHandlers()
    const heartbeat = getHandler("heartbeat")
    expect(heartbeat).not.toBeNull()
    await expect(heartbeat!({})).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run lib/jobs/__tests__/handlers 2>&1 | tail -5`
Expected: FAIL — cannot resolve `@/lib/jobs/handlers`.

- [ ] **Step 3: Implement the registry**

```typescript
export type JobHandler = (payload: unknown) => Promise<void>

const registry = new Map<string, JobHandler>()

export function registerHandler(type: string, handler: JobHandler) {
  if (registry.has(type)) {
    throw new Error(`Job handler "${type}" is already registered`)
  }
  registry.set(type, handler)
}

export function getHandler(type: string): JobHandler | null {
  return registry.get(type) ?? null
}

// Test-only escape hatch so each test starts from a clean registry.
export function clearHandlers() {
  registry.clear()
}

// Builtins are registered explicitly by the worker entrypoint (not at import
// time) so tests control registry state.
export function registerBuiltinHandlers() {
  // No-op job that proves the enqueue → claim → run → complete pipeline
  // end-to-end, on a schedule, in production.
  registerHandler("heartbeat", async () => {})
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run lib/jobs 2>&1 | tail -5`
Expected: 14 tests pass (10 queue + 4 registry).

- [ ] **Step 5: Commit**

```bash
git add lib/jobs
git commit -m "feat(jobs): handler registry with heartbeat builtin"
```

---

### Task 4: Worker process + PM2 wiring

**Files:**
- Create: `scripts/worker.ts`
- Modify: `ecosystem.config.js`
- Modify: `deploy.sh` (the `pm2 reload` line)

- [ ] **Step 1: Write the worker entrypoint**

Relative imports (not `@/`) — this file runs under tsx outside Next's resolver.

```typescript
// Background worker: polls the Job queue and runs cron schedules.
// Runs as the single-instance PM2 app "lingocon-worker" (see ecosystem.config.js).
// `tsx scripts/worker.ts --once` enqueues a heartbeat, drains the queue, and
// exits — used as a smoke test in dev and on the server.
import "dotenv/config"
import cron from "node-cron"
import { claimNextJob, completeJob, failJob, enqueueJob } from "../lib/jobs/queue"
import { getHandler, registerBuiltinHandlers } from "../lib/jobs/handlers"
import { prisma } from "../lib/prisma"

const POLL_INTERVAL_MS = 5000
let shuttingDown = false

async function processOne(): Promise<boolean> {
  const job = await claimNextJob()
  if (!job) return false

  const handler = getHandler(job.type)
  if (!handler) {
    await failJob(job.id, new Error(`No handler registered for job type "${job.type}"`))
    return true
  }

  try {
    await handler(job.payload)
    await completeJob(job.id)
    console.log(`[worker] completed ${job.type} (${job.id})`)
  } catch (error) {
    await failJob(job.id, error)
    console.error(`[worker] failed ${job.type} (${job.id}):`, error)
  }
  return true
}

async function drain() {
  while (await processOne()) {
    // keep going until the queue is empty
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  registerBuiltinHandlers()

  if (process.argv.includes("--once")) {
    await enqueueJob("heartbeat")
    await drain()
    await prisma.$disconnect()
    console.log("[worker] --once run complete")
    return
  }

  // Hourly heartbeat proves the pipeline is alive in production.
  cron.schedule("0 * * * *", () => {
    void enqueueJob("heartbeat")
  })

  process.on("SIGINT", () => { shuttingDown = true })
  process.on("SIGTERM", () => { shuttingDown = true })

  console.log("[worker] started, polling every 5s")
  while (!shuttingDown) {
    try {
      await drain()
    } catch (error) {
      console.error("[worker] poll loop error:", error)
    }
    await sleep(POLL_INTERVAL_MS)
  }
  await prisma.$disconnect()
  console.log("[worker] shut down cleanly")
}

void main()
```

- [ ] **Step 2: Add the worker app to PM2 config**

In `ecosystem.config.js`, add a second entry to `apps` after the `lingocon` app:

```javascript
        {
            name: 'lingocon-worker',
            script: 'node_modules/.bin/tsx',
            args: 'scripts/worker.ts',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production'
            }
        }
```

- [ ] **Step 3: Make deploy start new apps, not just reload existing ones**

In `deploy.sh`, replace:

```bash
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
```

with:

```bash
pm2 startOrReload ecosystem.config.js
```

(`startOrReload` reloads running apps zero-downtime AND starts apps newly added to the config — `reload` alone would silently skip `lingocon-worker` on first deploy.)

- [ ] **Step 4: Smoke-test the worker end-to-end against the dev DB**

Run: `npx tsx scripts/worker.ts --once`
Expected output: `[worker] completed heartbeat (<id>)` then `[worker] --once run complete`.

Then verify the row: `npx prisma db execute --stdin <<< "SELECT type, attempts, error, \"finishedAt\" IS NOT NULL AS done FROM jobs ORDER BY \"createdAt\" DESC LIMIT 1;"` — or check via `npx prisma studio`. Expected: `heartbeat`, attempts 1, error null, done true.

- [ ] **Step 5: Verify tsc still clean, then commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add scripts/worker.ts ecosystem.config.js deploy.sh
git commit -m "feat(jobs): PM2 worker process with cron heartbeat and queue polling"
```

---

### Task 5: FTS migration (tsvector + pg_trgm)

**Files:**
- Modify: `prisma/schema.prisma` (5 models get an `Unsupported("tsvector")` column)
- Create: `prisma/migrations/<timestamp>_fts_foundation/migration.sql` (via `--create-only`, then hand-edited)

Config `simple` is deliberate: no English stemming (wrong for conlang lemmas), immutable so it works in GENERATED columns. Tables are small at current scale, so plain `CREATE INDEX` (not `CONCURRENTLY`) is fine and keeps the migration transactional.

- [ ] **Step 1: Add searchVector fields to the schema**

Add to each of these models (`Language`, `DictionaryEntry`, `GrammarPage`, `Article`, `Text`), next to their other scalar fields:

```prisma
  searchVector Unsupported("tsvector")?
```

- [ ] **Step 2: Create the migration without applying**

Run: `npx prisma migrate dev --name fts_foundation --create-only`
Expected: a new migration folder with ALTER TABLE statements adding plain `tsvector` columns.

- [ ] **Step 3: Replace the generated SQL entirely with:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Generated tsvector columns ('simple' config: immutable, no stemming — conlang-safe)
ALTER TABLE "languages" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;
ALTER TABLE "dictionary_entries" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("lemma", '') || ' ' || coalesce("gloss", ''))) STORED;
ALTER TABLE "grammar_pages" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", ''))) STORED;
ALTER TABLE "articles" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("excerpt", ''))) STORED;
ALTER TABLE "texts" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;

-- Rank/index the vectors
CREATE INDEX "languages_searchVector_idx" ON "languages" USING GIN ("searchVector");
CREATE INDEX "dictionary_entries_searchVector_idx" ON "dictionary_entries" USING GIN ("searchVector");
CREATE INDEX "grammar_pages_searchVector_idx" ON "grammar_pages" USING GIN ("searchVector");
CREATE INDEX "articles_searchVector_idx" ON "articles" USING GIN ("searchVector");
CREATE INDEX "texts_searchVector_idx" ON "texts" USING GIN ("searchVector");

-- Trigram indexes for typo-tolerant lemma/IPA lookup
CREATE INDEX "dictionary_entries_lemma_trgm_idx" ON "dictionary_entries" USING GIN ("lemma" gin_trgm_ops);
CREATE INDEX "dictionary_entries_ipa_trgm_idx" ON "dictionary_entries" USING GIN ("ipa" gin_trgm_ops);
```

- [ ] **Step 4: Apply and verify**

Run: `npx prisma migrate dev`
Expected: applies cleanly, `prisma generate` succeeds.

Run: `npx prisma db execute --stdin <<< "SELECT count(*) FROM dictionary_entries WHERE \"searchVector\" IS NOT NULL;"`
Expected: equals the total row count (generated columns backfill on ALTER).

- [ ] **Step 5: Verify tsc + tests + build still clean**

Run: `npx tsc --noEmit && npm test -- --run 2>&1 | tail -3`
Expected: clean, 225 tests (211 + 14 from Tasks 2–3).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(search): tsvector generated columns + GIN/trigram indexes (FTS foundation)"
```

---

### Task 6: Ranked FTS search service (TDD)

**Files:**
- Create: `lib/services/search-fts.ts`
- Test: `lib/services/__tests__/search-fts.test.ts`
- Create: `scripts/verify-fts.ts` (manual live check)

Same public contract as `lib/services/search.ts` (`search(query, scope): Promise<SearchResult>`) so Wave 1 swaps the import and nothing else. Raw SQL via `$queryRaw` tagged templates (parameterized — no injection), `websearch_to_tsquery` for query parsing, `ts_rank` ordering, trigram `similarity()` fallback for dictionary lookups when FTS finds nothing (typo tolerance).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

import { searchFts } from "@/lib/services/search-fts"

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.$queryRaw.mockResolvedValue([])
})

describe("searchFts", () => {
  it("returns empty buckets for queries shorter than 2 chars without querying", async () => {
    const result = await searchFts("a")
    expect(result).toEqual({ languages: [], entries: [], grammarPages: [], articles: [], texts: [] })
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
  })

  it("scope 'all' runs all five queries", async () => {
    await searchFts("water")
    // languages, entries, grammar, articles, texts (entries fallback only fires on empty FTS)
    expect(mockPrisma.$queryRaw.mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it("scope 'dictionary' only queries entries", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: "e1", lemma: "aqua", gloss: "water", ipa: "ˈa.kwa",
        languageId: "l1", languageName: "Novian", languageSlug: "novian", languageFontFamily: null,
      },
    ])
    const result = await searchFts("aqua", "dictionary")
    expect(result.entries).toEqual([
      {
        id: "e1", lemma: "aqua", gloss: "water", ipa: "ˈa.kwa",
        language: { id: "l1", name: "Novian", slug: "novian", fontFamily: null },
      },
    ])
    expect(result.languages).toEqual([])
    expect(result.grammarPages).toEqual([])
  })

  it("reshapes language rows including counts", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: "l1", name: "Novian", slug: "novian", description: "a lang", flagUrl: null,
        ownerName: "Alex", ownerImage: null,
        scriptSymbols: 12, grammarPages: 3, dictionaryEntries: 240,
      },
    ])
    const result = await searchFts("novian", "languages")
    expect(result.languages).toEqual([
      {
        id: "l1", name: "Novian", slug: "novian", description: "a lang", flagUrl: null,
        owner: { name: "Alex", image: null },
        _count: { scriptSymbols: 12, grammarPages: 3, dictionaryEntries: 240 },
      },
    ])
  })

  it("falls back to trigram similarity for entries when FTS finds nothing", async () => {
    // First call (FTS) returns empty, second call (trigram) returns a hit
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "e1", lemma: "aqua", gloss: "water", ipa: null,
          languageId: "l1", languageName: "Novian", languageSlug: "novian", languageFontFamily: null,
        },
      ])
    const result = await searchFts("aqva", "dictionary")
    expect(result.entries).toHaveLength(1)
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run lib/services/__tests__/search-fts 2>&1 | tail -5`
Expected: FAIL — cannot resolve `@/lib/services/search-fts`.

- [ ] **Step 3: Implement the service**

```typescript
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
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

  // Typo-tolerant fallback: trigram similarity on lemma/IPA.
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
```

Note: verify the exact table names for `script_symbols` and `users` against `@@map` directives in `prisma/schema.prisma` before finalizing (the `User` model may be mapped to `users` or unmapped — if unmapped, use `"User"`). Same check for `script_symbols`. Adjust the SQL identifiers to match; the tests are name-agnostic.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run lib/services/__tests__/search-fts 2>&1 | tail -5`
Expected: 5 tests pass.

- [ ] **Step 5: Write the live verification script**

`scripts/verify-fts.ts`:

```typescript
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
```

Run: `npx tsx scripts/verify-fts.ts water` (and once with a deliberate typo, e.g. a misspelled known lemma, to see the trigram fallback fire).
Expected: non-crashing ranked results from the dev DB; typo query still returns the close lemma.

- [ ] **Step 6: Full check + commit**

Run: `npx tsc --noEmit && npm test -- --run 2>&1 | tail -3`
Expected: clean, 230 tests.

```bash
git add lib/services/search-fts.ts lib/services/__tests__/search-fts.test.ts scripts/verify-fts.ts
git commit -m "feat(search): ranked FTS service with trigram typo fallback (same SearchResult contract)"
```

---

### Task 7: Upload validation library (TDD) + route refactor

**Files:**
- Create: `lib/uploads.ts`
- Test: `lib/__tests__/uploads.test.ts`
- Modify: `app/api/upload/route.ts`

Extracts the validation currently inlined in the route into pure functions, adds per-type size caps (today everything shares 15 MB), and a `word-audio` type (1 MB cap) ready for Wave 4's recorder. Route behavior for existing types is unchanged except tighter audio caps.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest"
import { validateUpload, UPLOAD_RULES, type UploadType } from "@/lib/uploads"

const base = { name: "file.png", mimeType: "image/png", size: 1000 }

describe("validateUpload", () => {
  it("accepts a valid image for 'flag'", () => {
    const result = validateUpload({ ...base, type: "flag" })
    expect(result).toEqual({ ok: true, ext: "png", dir: "flag" })
  })

  it("maps 'image' type to the 'cover' directory", () => {
    const result = validateUpload({ ...base, type: "image" })
    expect(result).toEqual({ ok: true, ext: "png", dir: "cover" })
  })

  it("rejects unknown upload types", () => {
    const result = validateUpload({ ...base, type: "evil" as UploadType })
    expect(result.ok).toBe(false)
  })

  it("rejects oversized files per type", () => {
    const tooBig = UPLOAD_RULES["word-audio"].maxBytes + 1
    const result = validateUpload({ name: "w.webm", mimeType: "audio/webm", size: tooBig, type: "word-audio" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/too large/i)
  })

  it("accepts word-audio under the 1MB cap", () => {
    const result = validateUpload({ name: "w.webm", mimeType: "audio/webm", size: 500_000, type: "word-audio" })
    expect(result).toEqual({ ok: true, ext: "webm", dir: "word-audio" })
  })

  it("rejects wrong MIME for the type", () => {
    const result = validateUpload({ name: "x.png", mimeType: "image/png", size: 100, type: "audio" })
    expect(result.ok).toBe(false)
  })

  it("strips MIME parameters before matching", () => {
    const result = validateUpload({ name: "a.webm", mimeType: "audio/webm;codecs=opus", size: 100, type: "audio" })
    expect(result.ok).toBe(true)
  })

  it("falls back to extension for fonts with generic MIME", () => {
    const result = validateUpload({ name: "MyFont.woff2", mimeType: "application/octet-stream", size: 100, type: "font" })
    expect(result).toEqual({ ok: true, ext: "woff2", dir: "font" })
  })

  it("normalizes hostile extensions to the allow-list", () => {
    const result = validateUpload({ name: "../../etc/passwd%00.png", mimeType: "image/png", size: 100, type: "image" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.ext).toBe("png")
  })

  it("rejects extensions not allowed for the type even with valid MIME", () => {
    const result = validateUpload({ name: "sneaky.html", mimeType: "image/png", size: 100, type: "image" })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run lib/__tests__/uploads 2>&1 | tail -5`
Expected: FAIL — cannot resolve `@/lib/uploads`.

- [ ] **Step 3: Implement the library**

```typescript
// Shared upload validation used by app/api/upload/route.ts (and, from Wave 4,
// the audio recorder). Pure — no fs, no next imports — so it unit-tests cleanly.

const IMAGE_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
const AUDIO_MIME = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/wav", "audio/mp4"]
const AUDIO_EXT = ["webm", "mp3", "ogg", "wav", "m4a", "mp4"]
const FONT_MIME = [
  "font/ttf", "font/otf", "font/woff", "font/woff2",
  "application/x-font-ttf", "application/x-font-opentype", "application/font-woff", "application/font-woff2",
  "font/sfnt", "application/font-sfnt", "application/vnd.ms-opentype", "application/x-font-truetype",
]
const FONT_EXT = ["ttf", "otf", "woff", "woff2"]
const FILE_MIME = [...IMAGE_MIME, "application/pdf", "text/plain", "application/epub+zip", ...FONT_MIME, ...AUDIO_MIME]
const FILE_EXT = [...IMAGE_EXT, "pdf", "txt", "epub", ...FONT_EXT, ...AUDIO_EXT]

const MB = 1024 * 1024

export type UploadType = "flag" | "cover" | "image" | "file" | "font" | "audio" | "word-audio"

interface UploadRule {
  mime: string[]
  ext: string[]
  maxBytes: number
  /** Directory under public/uploads; defaults to the type name. */
  dir?: string
  /** Fonts arrive with generic MIME on some OSes — trust the extension. */
  extFallback?: boolean
}

export const UPLOAD_RULES: Record<UploadType, UploadRule> = {
  flag: { mime: IMAGE_MIME, ext: IMAGE_EXT, maxBytes: 5 * MB },
  cover: { mime: IMAGE_MIME, ext: IMAGE_EXT, maxBytes: 15 * MB },
  image: { mime: IMAGE_MIME, ext: IMAGE_EXT, maxBytes: 15 * MB, dir: "cover" },
  file: { mime: FILE_MIME, ext: FILE_EXT, maxBytes: 15 * MB },
  font: { mime: FONT_MIME, ext: FONT_EXT, maxBytes: 15 * MB, extFallback: true },
  audio: { mime: AUDIO_MIME, ext: AUDIO_EXT, maxBytes: 5 * MB },
  "word-audio": { mime: AUDIO_MIME, ext: AUDIO_EXT, maxBytes: 1 * MB },
}

export interface UploadInput {
  name: string
  mimeType: string
  size: number
  type: UploadType
}

export type UploadValidation =
  | { ok: true; ext: string; dir: string }
  | { ok: false; error: string }

export function validateUpload(input: UploadInput): UploadValidation {
  const rule = UPLOAD_RULES[input.type]
  if (!rule) return { ok: false, error: "Invalid upload type" }

  if (input.size > rule.maxBytes) {
    return { ok: false, error: `File too large (max ${Math.round(rule.maxBytes / MB)}MB)` }
  }

  const ext = input.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? ""
  const mime = input.mimeType.split(";")[0].trim().toLowerCase()

  const mimeOk = rule.mime.includes(mime)
  const extOk = rule.ext.includes(ext)

  if (!extOk) {
    return { ok: false, error: `Invalid file extension ".${ext}" for ${input.type} upload` }
  }
  if (!mimeOk && !(rule.extFallback && extOk)) {
    return { ok: false, error: `Invalid file type "${mime}" for ${input.type} upload` }
  }

  return { ok: true, ext, dir: rule.dir ?? input.type }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run lib/__tests__/uploads 2>&1 | tail -5`
Expected: 10 tests pass.

- [ ] **Step 5: Refactor the route to use it**

In `app/api/upload/route.ts`: replace the inline constants and the validation block (type allow-list, size check, MIME check, font fallback, `uploadType` mapping, extension derivation) with:

```typescript
import { validateUpload, type UploadType } from "@/lib/uploads"
```

```typescript
    const validation = validateUpload({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      type: type as UploadType,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
```

Then use `validation.dir` where `uploadType` was used (upload directory + URL path) and `validation.ext` where `ext` was derived from the filename. Keep the sharp→webp conversion exactly as is (it overrides ext/filename for non-SVG images). Keep the `ALLOWED_IMAGE_TYPES.includes(file.type)` webp-conversion condition by importing nothing new — test `file.type.startsWith("image/") && file.type !== "image/svg+xml"` is NOT equivalent (svg is image/); instead move the original `ALLOWED_IMAGE_TYPES` list check into the route as `["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)` — the conversion list minus svg, inlined.

- [ ] **Step 6: Full check + commit**

Run: `npx tsc --noEmit && npm test -- --run 2>&1 | tail -3`
Expected: clean, 240 tests.

```bash
git add lib/uploads.ts lib/__tests__/uploads.test.ts app/api/upload/route.ts
git commit -m "refactor(uploads): extract shared validation with per-type size caps + word-audio type"
```

---

### Task 8: Wave gate + PR

- [ ] **Step 1: Full verification suite**

```bash
npm test -- --run 2>&1 | tail -3        # expect 240 tests, 0 failures
npx tsc --noEmit                        # expect clean
npm run build 2>&1 | tail -5            # expect successful build
```

- [ ] **Step 2: E2E under Node 18**

```bash
PATH=~/.nvm/versions/node/v18.20.8/bin:$PATH npx playwright test 2>&1 | tail -5
```
Expected: 9/9 passing (Playwright breaks under Node 25 — Node 18 is mandatory).

- [ ] **Step 3: Worker smoke test one more time**

Run: `npx tsx scripts/worker.ts --once`
Expected: heartbeat completes.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u github wave0-shared-infra
gh pr create --repo alexcircuits/lingocon --base main --head wave0-shared-infra \
  --title "Wave 0: shared infrastructure (job queue worker, FTS foundation, upload validation)" \
  --body "$(cat <<'EOF'
## Summary
Foundation wave from the 2026-07-03 master roadmap (docs/superpowers/plans/). Three pieces every later wave depends on:

- **Job queue + PM2 worker** — `Job` model, optimistic-claim queue (`lib/jobs/`), `scripts/worker.ts` running as single-instance PM2 app `lingocon-worker` with an hourly heartbeat proving the pipeline. `deploy.sh` now uses `pm2 startOrReload` so the new app starts on first deploy.
- **FTS foundation** — pg_trgm extension, generated `tsvector` columns (`simple` config, conlang-safe) + GIN/trigram indexes on languages/dictionary/grammar/articles/texts, and `lib/services/search-fts.ts` returning the exact `SearchResult` contract of the current search (UI swap lands in Wave 1) with typo-tolerant trigram fallback.
- **Upload validation library** — extracted from the upload route into pure `lib/uploads.ts` with per-type size caps and a `word-audio` type (1MB) ready for Wave 4's recorder.

## Test plan
- [ ] 240 vitest tests green (211 baseline + 29 new)
- [ ] tsc + build clean
- [ ] Playwright e2e 9/9 under Node 18
- [ ] `npx tsx scripts/worker.ts --once` completes a heartbeat against the dev DB
- [ ] `npx tsx scripts/verify-fts.ts <word>` returns ranked results; typo query hits the trigram fallback
- [ ] After deploy: `pm2 ls` shows `lingocon-worker` online; hourly heartbeat rows appear in `jobs`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Post-merge deploy note (user-gated — do not run without explicit go-ahead)**

After the PR merges to main: `git push vps main` triggers build + `prisma migrate deploy` + `pm2 startOrReload`. Then verify: `curl https://lingocon.com/api/health` → `{status:ok, db:up}`, and `ssh root@72.61.136.193 'pm2 ls'` shows `lingocon-worker` online.

---

## Self-review notes

- **Test-count math:** 211 baseline + 10 (queue) + 4 (handlers) + 5 (search-fts) + 10 (uploads) = 240.
- **Known verification points for the executor:** table names in raw SQL (`users`, `script_symbols`) must be checked against `@@map` in schema.prisma (Task 6 Step 3 note); `Text.type` enum cast `::text` assumed — confirm the column exists as `type`.
- **Not in this wave (deliberate):** swapping the search UI to FTS (Wave 1.5), any recorder UI (Wave 4), any real cron jobs beyond heartbeat (Waves 3/5/6), unaccent extension (skipped — `simple` config + trigram covers the need without immutability headaches).
