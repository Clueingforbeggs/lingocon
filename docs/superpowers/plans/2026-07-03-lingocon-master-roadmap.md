# LingoCon Master Roadmap — Plan of Record

> **For agentic workers:** This is the MASTER plan. Each Wave below is an independent sub-project. Before executing a Wave, write a detailed task-level implementation plan for it (REQUIRED SUB-SKILL: superpowers:writing-plans), then execute via superpowers:subagent-driven-development or superpowers:executing-plans. Do not execute directly from this document — it locks in scope, schema, and sequencing, not per-task steps.

**Goal:** Make LingoCon the definitive conlang platform by deepening its unique moat (build → document → *learn*) across four legs: the linguistics engine, auto-inflection, the learning loop, and the community flywheel — all deterministic, zero AI.

**Architecture:** Seven shippable waves ordered by dependency and ROI, preceded by a shared-infrastructure wave built exactly once (job scheduler, Postgres FTS, upload service). The Go/WASM linguistics core becomes the single canonical engine and is progressively reused by evolution, inflection, the phonotactics linter, and the word generator.

**Tech Stack:** Next.js 14 (App Router, server actions), Prisma + PostgreSQL, Go→WASM (`linguistics-core/`), vitest (unit), Playwright (e2e, Node 18 only), PM2 on VPS (`git push vps main` auto-deploys), next-intl (en/uk/fr/ru).

---

## Ground rules (apply to every wave)

- **Start state:** merge PR #54 (`phase0-operational-safety`) into `main` first; reconcile the currently modified working-tree files (`app/learn/page.tsx`, `lesson-engine.tsx`, `learn-language-card.tsx`) before Wave 1. GitHub `main` must equal vps `main` before new work.
- **Branch per wave** (e.g. `wave1-learn-quick-wins`), conventional commits, PR to `main`, deploy via `git push vps main` only after the gate passes.
- **Verification gate per wave:** `npm test` green (baseline 211, only ever grows) → `npx tsc --noEmit` → `npm run build` → Playwright e2e under Node 18 (`PATH=~/.nvm/versions/node/v18.20.8/bin:$PATH`) → deploy → `curl https://lingocon.com/api/health` returns `{status:ok, db:up}` → manual smoke of the wave's headline feature in prod.
- **i18n is part of done:** every user-facing string lands in all 4 locales (en/uk/fr/ru) with key-count parity, same PR.
- **Migrations:** additive only; destructive changes go through a two-deploy expand/contract. Index creation on large tables uses `CREATE INDEX CONCURRENTLY` in a manual migration.
- **TDD:** pure logic lives in `lib/` (or `linguistics-core/`) with unit tests written first; server actions get integration tests; each wave's flagship flow gets one e2e journey.
- **Seeds:** any new badge/word-set seed must also be run on prod (`ssh root@72.61.136.193`, `cd /var/www/lingocon && set -a && . ./.env && set +a && node_modules/.bin/tsx prisma/<seed>.ts`) — deploy.sh does not seed.

---

## Dependency graph

```
Wave 0 (infra: cron, FTS, uploads)
 ├── Wave 1 (learn quick wins, search v2)          ← FTS
 ├── Wave 2 (engine v2)                            ← standalone
 │     ├── Wave 3 (auto-inflection)                ← engine v2 snippets, cron (regen jobs)
 │     │     └── inflected-form exercises (in W3)
 │     └── phonotactics linter, debugger (in W2)
 ├── Wave 4 (audio + IME)                          ← uploads
 │     └── listening + script-typing exercises (in W4)
 ├── Wave 5 (leagues/quests/streaks/practice hub)  ← cron
 └── Wave 6 (boards, relays, word sets, discovery) ← cron (events), FTS (discovery)
       └── Wave 7 (trust & expansion)              ← revisions before classrooms/embeds
```

Waves 2 and 4 are independent of each other and of Wave 5 — two parallel tracks are possible after Wave 1 (Track A: 2→3, Track B: 4→5). Wave 6 needs nothing from 2–4. Wave 7 closes.

---

## Wave 0 — Shared infrastructure (build once) · ~1 week

### 0.1 Job scheduler
Leagues, monthly quests, friend streaks, event lifecycles, and inflection regeneration all need scheduled/background work. There is none today.

- New PM2 app `lingocon-worker` in `ecosystem.config.js` running `scripts/worker.ts` (tsx): `node-cron` loop + a simple DB-backed job queue.
- New model:
  ```prisma
  model Job {
    id          String    @id @default(cuid())
    type        String    // 'league_rollover' | 'inflection_regen' | 'event_close' | ...
    payload     Json
    runAfter    DateTime  @default(now())
    startedAt   DateTime?
    finishedAt  DateTime?
    error       String?   @db.Text
    attempts    Int       @default(0)
    @@index([type, finishedAt, runAfter])
    @@map("jobs")
  }
  ```
- Claim-with-`UPDATE ... WHERE startedAt IS NULL` inside `$transaction` (single worker now, safe for two later). `lib/jobs/` holds pure handlers, unit-tested; the worker file is a thin dispatcher.
- deploy.sh: add `pm2 reload lingocon-worker`.

### 0.2 Postgres full-text foundation
- Manual migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;`
- Generated `tsvector` columns + GIN indexes (concurrently) on: `dictionary_entries(lemma, gloss)`, `grammar_pages(title, plain-text content)`, `articles(title, excerpt)`, `texts(title)`, `languages(name, description)`. Rich-text (TipTap JSON) is indexed via a SQL expression stripping to text.
- GIN trigram indexes on `dictionary_entries.lemma` and `.ipa` for fuzzy/regex search.
- `lib/services/search-fts.ts`: `$queryRaw` with `websearch_to_tsquery` + `ts_rank`, `similarity()` fallback when FTS yields nothing. Same `SearchResult` interface as today's `lib/services/search.ts` so the UI doesn't change in this wave.

### 0.3 Upload service hardening
- Single `lib/uploads.ts` used by every upload path: MIME allow-list (add `audio/webm`, `audio/mpeg`, `audio/ogg`), per-file size caps (audio 1 MB/word), per-user daily quota, filename sanitization. Audio lands under `app/uploads` alongside images. (S3 offload is a deliberate non-goal until storage pressure is real.)

**Gate extras:** worker visible in `pm2 ls` on prod; a no-op heartbeat job completes; FTS query returns ranked results on prod data.

---

## Wave 1 — Learn-loop quick wins + Search v2 · ~1–2 weeks

Fast, visible wins that need no new engine work. Five independent items — order within the wave is free.

### 1.1 Activate dormant card types
- `lib/lesson-generator.ts`: generate `CLOZE` items from `ExampleSentence` (blank the target lemma; distractors from same-POS entries) and `GRAMMAR_READ` from unit grammar pages.
- `types/lesson.ts`: add `ClozeExercise { type: "CLOZE"; sentence: string; answer: string; options: {...}[] }` — reuses the multiple-choice renderer with a gap-sentence layout in `lesson-engine.tsx`.
- StudyCard generation starts producing `CLOZE`/`GRAMMAR_READ` `cardType` rows for entries that have example sentences.

### 1.2 Close the lesson→SRS gap (the structural fix)
- In `completeLesson` (`app/actions/learn.ts`): for every graded exercise mapped to a `StudyCard`, write a `CardReview` and reschedule via the existing FSRS lib — correct→`GOOD`, incorrect→`AGAIN`, perfect-lesson bonus→`EASY`. Wrapped in the existing transaction.
- Pure mapping function `lib/fsrs/lesson-to-review.ts` (exercise results → ratings), tested first.

### 1.3 Anki/CSV deck export
- `app/api/export/deck/[languageId]/route.ts`: CSV (lemma, gloss, IPA, example, audio filename) + `.apkg`. Build `.apkg` with `sql.js` against a vendored empty-deck SQLite template (the format is a zip of `collection.anki2` + media manifest — no fragile npm dep). If the template approach stalls > 2 days, ship CSV+media-zip first and finish `.apkg` inside the wave.

### 1.4 Word generator constraints
- `lib/utils/word-generator.ts`: `rejectPatterns: string[]` (regex, e.g. forbidden clusters), `dedupe` against existing lemmas (caller passes a `Set`), weighted optional slots `(C)` with configurable probability. Dialog UI (`word-generator-dialog.tsx`) gets a "forbidden sequences" textarea + "hide words I already have" toggle.

### 1.5 Global search v2 + dictionary advanced search
- Swap `lib/services/search.ts` internals to the Wave 0 FTS service; ranked, typo-tolerant, unaccented.
- Dictionary page: POS filter, reverse-gloss mode, phoneme/regex pattern search (trigram-index-backed `~` query with a 500 ms statement timeout and server-side regex validation).

---

## Wave 2 — Engine v2: Lexurgy-class sound changes · ~3–4 weeks

The flagship. All engine work happens in `linguistics-core/soundchange` (Go) with golden-file tests; the TS engine (`lib/utils/sound-change.ts`) is demoted to a thin WASM wrapper.

### 2.1 Grammar v2 (versioned, backward compatible)
A rules document may start with directives; their absence means v1 semantics — **every existing saved ruleset keeps working verbatim** (golden tests copy real prod rulesets before any refactor).

```
class K = p t k
feature voiced: p/b, t/d, k/g, s/z
syllables: (C)V(C)          # enables auto-syllabification, '.' boundaries, stress rules
stage: Old Form              # named checkpoint — output captured here
K → [+voiced] / V_V          # feature arithmetic
a i → i a / _#               # multi-segment (metathesis); $1 $2 backrefs for gemination
romanizer: ʃ → sh            # final + intermediate romanizers
```

Implementation order inside the Go engine (each lands with parser + scanner + tests before the next): user classes → feature matrix → backrefs/multi-segment → syllabification + stress → stages/romanizers.

### 2.2 One canonical engine
- Node loads the same WASM via `wasm_exec.js` (init in `instrumentation.ts`, TS-engine fallback only until parity ships). `apply-sound-changes.ts`, `evolve-language.ts`, and `lib/utils/derive-forms.ts` all route through one `lib/linguistics/engine.ts` façade returning `Result` + per-stage outputs.

### 2.3 Debugger + rule test suites
- Sound-changes studio page: per-word derivation timeline (word at every rule/stage, changed rules highlighted) — the engine already returns per-rule results; expose the trace.
- New model `RuleTest { id, languageId, input, expected, createdAt }`; test panel runs on save, red/green per case. This is what makes rule refactoring safe and what migrates Lexurgy users.

### 2.4 Phonotactics linter
- Reuses the v2 syllabifier: validate every dictionary lemma (and IPA) against declared syllable shapes + phoneme inventory. Report page under studio analytics: illegal words, unknown segments, per-entry warning badges. Pure function in `linguistics-core`, surfaced via WASM.

### 2.5 Evolution preview-diff
- `evolve-language` flow gains a dry-run screen: table of lemma → derived form (with stage columns), per-row opt-out checkboxes, then commit. Uses the same façade; no schema change.

---

## Wave 3 — Auto-inflection · ~2–3 weeks

Depends on Wave 2 (cell rules may embed engine-v2 snippets) and Wave 0 (regen jobs).

### 3.1 Schema
```prisma
model ParadigmRule {
  id         String   @id @default(cuid())
  paradigmId String
  cellKey    String   // "row:col" coordinate in slots
  pattern    String   // "-ō" suffix | "re- + %" | "% → soundchange snippet"
  condition  String?  // optional match on entry (POS, tag, regex on lemma)
  paradigm   Paradigm @relation(fields: [paradigmId], references: [id], onDelete: Cascade)
  @@unique([paradigmId, cellKey, condition])
  @@map("paradigm_rules")
}

model InflectedForm {
  id           String          @id @default(cuid())
  entryId      String
  paradigmId   String
  cellKey      String
  form         String
  ipa          String?
  entry        DictionaryEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  paradigm     Paradigm        @relation(fields: [paradigmId], references: [id], onDelete: Cascade)
  @@unique([entryId, paradigmId, cellKey])
  @@index([form])
  @@map("inflected_forms")
}
```
`Paradigm.slots` JSON is untouched (hand-filled tables keep working); rules are additive per cell. Hand-written override in `slots` always wins over a generated form.

### 3.2 Rule engine
- Pure `lib/inflection/apply.ts`: pattern grammar = affix templates (`-ō`, `re-%`, `%-ta-%` infix via explicit marker) + optional engine-v2 snippet applied after affixation (assimilation at morpheme boundaries — the killer feature). Tested exhaustively first.

### 3.3 UI + regeneration
- Paradigm editor: per-cell rule input with live preview against a picked sample entry.
- Dictionary entry page: "Forms" tab rendering the full generated table (existing `Paradigm ↔ DictionaryEntry` relation selects which paradigms apply).
- On rule change: enqueue `inflection_regen` job (Wave 0 worker) regenerating `InflectedForm` rows for affected entries in batches of 500.

### 3.4 Search + learn integration
- FTS/trigram index on `inflected_forms.form`; global search answers "which form is this?" with entry + cell label (e.g. *"karethō — 2sg.future of kareth"*).
- `lesson-generator.ts`: new inflection exercises — CLOZE on a form within its example sentence, and "type the ⟨2sg future⟩ of ⟨kareth⟩". **No other conlang platform has this.**

### 3.5 Bulk lexicon operations (lexicon-at-scale theme)
- Dictionary table: multi-select with batch actions (set POS, add tag, delete with confirm count) and a regex find/replace dialog across lemma/gloss/IPA with a mandatory dry-run preview table (matches + before/after) before applying inside one `$transaction`. Server action validates the regex and caps affected rows per run (500) to keep transactions bounded.

---

## Wave 4 — Audio + native-script input · ~2–3 weeks

Independent of Waves 2–3; can run in parallel after Wave 1.

### 4.1 Creator recordings
- `components/audio-recorder.tsx`: MediaRecorder (webm/opus), waveform preview, re-record, 30 s cap; uploads through Wave 0 service; writes the already-existing (never-read) `DictionaryEntry.audioUrl`.
- Recording affordance in the dictionary entry dialog + a "record missing words" queue view (sorted by lesson usage). Per-phoneme audio: `audioUrl` column added to `ScriptSymbol`/phonology entries, same recorder.
- Playback: speaker button on dictionary rows, hub word lists, and every learn exercise that shows a word (recording preferred, Polly fallback).

### 4.2 Listening exercises
- `types/lesson.ts`: `ListenChooseExercise` (hear → pick gloss) and `ListenTypeExercise` (hear → type the word); generated only for entries with recordings; wired into FSRS via Wave 1.2's mapping.

### 4.3 Keyboard/IME builder
```prisma
model KeyboardLayout {
  id         String   @id @default(cuid())
  languageId String   @unique
  mappings   Json     // [{ from: "sh", to: "ʃ" }, { from: "a'", to: "á" }, ...] longest-match-first
  enabled    Boolean  @default(true)
  language   Language @relation(fields: [languageId], references: [id], onDelete: Cascade)
  @@map("keyboard_layouts")
}
```
- Pure `lib/ime/transliterate.ts` (longest-prefix rewrite on input events, backspace-aware), tested first.
- `components/conlang-input.tsx` wrapper (input/textarea) with an on/off toggle chip; adopted in dictionary lemma fields, translate tool, and learn typing exercises.
- Layout editor page in studio settings. Extension integration deferred to Wave 7.

### 4.4 Script-typing exercises
- Existing `TranslateExercise` (to_target direction) rendered through `ConlangInput` when the language has an enabled layout — typing answers in the native romanization/script becomes natural.

---

## Wave 5 — Retention mechanics · ~2–3 weeks

All on existing data (`XPEvent`, `Follow`, `Enrollment.streak`, badges) + Wave 0 cron.

### 5.1 Leagues
```prisma
model LeagueCohort {
  id        String   @id @default(cuid())
  weekStart DateTime
  tier      Int      // 0 Bronze … 4 Diamond
  members   LeagueMember[]
  @@index([weekStart, tier])
  @@map("league_cohorts")
}
model LeagueMember {
  id        String @id @default(cuid())
  cohortId  String
  userId    String
  finalRank Int?
  outcome   String? // 'promoted' | 'stayed' | 'demoted'
  cohort    LeagueCohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  @@unique([cohortId, userId])
  @@map("league_members")
}
```
- Cron `league_rollover` (Mon 00:00 UTC, reuses `startOfWeekUtc` from `lib/leaderboard.ts`): rank each cohort by weekly XP sum, top 7 promote / bottom 7 demote, form next week's cohorts of ≤30 from active learners (any XP last week), notify outcomes via the existing notification system.
- `/learn/leaderboard` becomes "your league": tier ladder header, your cohort table, promotion/demotion zones shaded. Global top-20 stays as a second tab.

### 5.2 Daily + monthly quests
- Daily quests **computed, not stored**: 3 deterministic-per-user-per-day picks (seeded shuffle on `userId+date`) from templates — "earn 30 XP", "do 10 reviews", "finish 1 lesson", "try a listening exercise" — evaluated live against today's `XPEvent`/`CardReview` rows. Zero migration.
- Monthly quest stored as one `Job`-maintained counter badge: complete ≥20 daily-quest days in a month → collectible monthly badge (new `BadgeCategory` usage; seed via `prisma/seed-badges.ts`, run on prod).
- Quest panel on `/learn` next to the existing daily-goal pill.

### 5.3 Friend streaks
```prisma
model FriendStreak {
  id       String   @id @default(cuid())
  userAId  String   // lexicographically smaller id
  userBId  String
  current  Int      @default(0)
  best     Int      @default(0)
  lastDay  DateTime?
  @@unique([userAId, userBId])
  @@map("friend_streaks")
}
```
- Offered between mutual follows; a day counts when **both** earned XP that UTC day (nightly cron closes the day; opportunistic same-day update on XP write). Nudge notification when one side is missing at risk-of-break. Widget on `/learn` + profile.

### 5.4 Practice hub
- `/learn/[slug]/practice`: three deterministic modes over existing `StudyCard`/`CardReview` data — **Weak words** (lowest FSRS retrievability), **My mistakes** (cards with `AGAIN` in last 7 days), **Test out** (pass a 12-question unit quiz ≥90% → mark unit lessons complete, no XP farming: half XP).

---

## Wave 6 — Community flywheel · ~3–4 weeks

### 6.1 Discussion boards
```prisma
model Thread {
  id         String   @id @default(cuid())
  title      String
  languageId String?  // null = global category board
  category   String   // 'general' | 'help' | 'showcase' | 'events' | 'language'
  authorId   String
  pinned     Boolean  @default(false)
  locked     Boolean  @default(false)
  createdAt  DateTime @default(now())
  posts      Post[]
  @@index([languageId, category, createdAt])
  @@map("threads")
}
model Post {
  id        String   @id @default(cuid())
  threadId  String
  authorId  String
  body      String   @db.Text  // markdown, sanitized on render
  replyToId String?
  createdAt DateTime @default(now())
  thread    Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  @@index([threadId, createdAt])
  @@map("posts")
}
```
- `/community` (global categories) + "Discussion" tab on language hubs. Reuse notification types (`COMMENT_REPLY` pattern → `THREAD_REPLY`), admin mod tools (pin/lock/delete, audit-logged), rate limit posts/user/hour. Existing flat comments stay for dictionary/grammar inline notes.

### 6.2 Events: relays + monthly challenges
```prisma
model CommunityEvent {
  id        String   @id @default(cuid())
  type      String   // 'relay' | 'challenge'
  title     String
  brief     String   @db.Text
  startsAt  DateTime
  endsAt    DateTime
  status    String   @default("upcoming") // upcoming|active|voting|closed
  badgeId   String?  // reward badge
  @@map("community_events")
}
model RelayTurn {
  id        String   @id @default(cuid())
  eventId   String
  userId    String
  position  Int
  torchText String?  @db.Text  // the text they received (hidden until reveal)
  passedText String? @db.Text  // what they handed on
  gloss     String?  @db.Text  // their interlinear + grammar notes
  deadline  DateTime
  @@unique([eventId, position])
  @@map("relay_turns")
}
model EventSubmission {
  id        String   @id @default(cuid())
  eventId   String
  userId    String
  languageId String
  body      String   @db.Text
  votes     Int      @default(0)
  @@unique([eventId, userId])
  @@map("event_submissions")
}
```
- **Relays:** signup queue → cron assigns positions and deadlines → each participant sees only the previous turn's text+gloss → skip-on-deadline → grand reveal page showing the drift chain. This is the classic community format no platform hosts.
- **Monthly challenges:** themed brief (seeded content calendar), submissions in your conlang, one-vote-per-user, badge for winners + participation. Event lifecycle transitions run on the Wave 0 worker; admin CRUD behind the existing admin panel.

### 6.3 Lexical-field word sets (LexiBuild)
```prisma
model WordSet {
  id     String  @id @default(cuid())
  slug   String  @unique  // 'kinship', 'colors', 'weather', ...
  name   String
  items  WordSetItem[]
  @@map("word_sets")
}
model WordSetItem {
  id       String  @id @default(cuid())
  wordSetId String
  concept  String  // 'mother', 'older brother', ...
  hint     String?
  wordSet  WordSet @relation(fields: [wordSetId], references: [id], onDelete: Cascade)
  @@map("word_set_items")
}
```
- Seed ~15 curated sets (kinship, numerals, colors, body, weather, emotions, tools, food, time, motion, speech, trade, war, nature, belief). Coverage = matching `DictionaryEntry.gloss` against concepts (normalized contains, same trick Swadesh coverage uses today). Studio analytics gains a per-set coverage grid; each uncovered concept has a one-click "coin this" opening the entry dialog pre-filled with the gloss.

### 6.4 Corpus tools
- Powered by Wave 0 FTS over `Text` content: corpus-wide search with KWIC concordance lines (word centered, ±6 words context), auto-derived frequency list (tokenized against the lexicon), and a "lexicon gaps" report — dictionary words never attested in any text, and text tokens missing from the dictionary (one-click "add to dictionary" pre-filled). Lives as a "Corpus" tab in studio analytics; pure tokenizer/concordance functions in `lib/corpus/` with unit tests first.
- Small companion: **numeral system builder** — define base + digit words + composition rules (`lib/numerals/spell.ts`, pure, tested), get any number spelled out; widget on the language hub.

### 6.5 Richer discovery
- `Language.typology Json?` — structured tags (word order, morphological type, tonal, script type) edited in settings; browse page gains typology filters (FTS/GIN-backed), "similar languages" (shared tags + family proximity), and a trending sort (7-day favorites+XP velocity, computed nightly into `Language.trendingScore Float @default(0)`).

---

## Wave 7 — Trust & expansion · ~3–4 weeks

### 7.1 Revision history (prerequisite for confident collaboration)
```prisma
model Revision {
  id         String   @id @default(cuid())
  entityType String   // 'grammar_page' | 'dictionary_entry' | 'article' | 'text'
  entityId   String
  authorId   String
  snapshot   Json     // full entity payload before the write
  createdAt  DateTime @default(now())
  @@index([entityType, entityId, createdAt])
  @@map("revisions")
}
```
- Write-path hook in the update/delete server actions for the four entity types (inside their transactions); history panel with field-level diff (jsondiffpatch-style, rich text diffed as text) + one-click restore (which itself writes a revision). Retention: last 100 revisions per entity, pruned by cron.

### 7.2 One-click backup / restore
- `app/api/export/backup/[languageId]/route.ts`: zip of everything (language JSON, dictionary, grammar TipTap JSON, texts, paradigms + rules, script symbols, sound-change rules, keyboard layout, audio files, courses). Restore = extend the existing import wizard to accept the archive (dry-run report → transactional import, reusing the `import-language.ts` transaction pattern).

### 7.3 Course snapshots
- On publish, freeze rendered lesson content into `LessonItem.data Json` (denormalized lemma/gloss/sentences) instead of live entry reads; `Course.contentVersion Int` + a "sync with dictionary" button producing a learner-visible changelog entry. Editing a language can no longer silently break in-flight learners.

### 7.4 PWA + offline reviews
- Upgrade the existing `public/sw.js` + `manifest.json` to a real installable PWA: precache the study shell, IndexedDB outbox for offline `CardReview`s, replay-on-reconnect endpoint `app/api/learn/sync-reviews` (idempotent by client-generated review id).

### 7.5 Ecosystem imports
- CSV column-mapping wizard (generic, replaces guesswork); PolyGlot `.pgd` (it's a zip of XML — parse lexicon, POS, pronunciation); Lexurgy `.lsc` rule import into engine v2 (map classes/features; report unsupported constructs line-by-line instead of failing).

### 7.6 Embeds + public read API
- `GET /api/v1/languages/{slug}` + `/dictionary?q=` (public languages only, token-less, rate-limited per IP via middleware) and an iframe embed `/embed/dictionary/[slug]` with a copy-paste snippet on the hub. Every embed is distribution.

### 7.7 Extension IME bridge
- Ship the Wave 4 transliteration engine inside the browser extension (`extension/content`): pick a language layout in the popup, type your conlang in any text field on the web. Reuses `lib/ime/transliterate.ts` verbatim (shared via the extension build).

### 7.8 Classrooms
```prisma
model Group {
  id        String  @id @default(cuid())
  name      String
  ownerId   String
  inviteCode String @unique
  members   GroupMember[]
  assignments GroupAssignment[]
  @@map("groups")
}
model GroupMember { id String @id @default(cuid()); groupId String; userId String; @@unique([groupId, userId]); @@map("group_members") }
model GroupAssignment { id String @id @default(cuid()); groupId String; courseId String; dueAt DateTime?; @@unique([groupId, courseId]); @@map("group_assignments") }
```
- Join by invite code; teacher dashboard = per-member course progress (existing `Enrollment`/`LessonCompletion` data). Deliberately minimal v1 — no grading, no LMS integrations.

---

## Sequencing summary

| # | Wave | Duration | Depends on | Headline |
|---|------|----------|------------|----------|
| 0 | Shared infra | 1 wk | PR #54 merged | cron worker, FTS, uploads |
| 1 | Learn quick wins + search | 1–2 wk | 0 | lesson→SRS fixed, CLOZE, Anki export, real search |
| 2 | Engine v2 | 3–4 wk | — | classes, features, syllables, stages, debugger, linter |
| 3 | Auto-inflection | 2–3 wk | 2 | auto-conjugated tables, inflected-form search + exercises |
| 4 | Audio + IME | 2–3 wk | 0 | recordings, listening exercises, native-script typing |
| 5 | Retention | 2–3 wk | 0 | leagues, quests, friend streaks, practice hub |
| 6 | Community | 3–4 wk | 0 | boards, relays, word sets, corpus tools, discovery |
| 7 | Trust & expansion | 3–4 wk | 6 (partly) | revisions, backup, snapshots, PWA, imports, API, extension IME, classrooms |

**Deliberately deferred (post-roadmap):** direct messages (boards + notifications must prove engagement first), real-time collaborative editing (needs Wave 7.1 revisions as its foundation), S3 media offload, framework upgrades (NextAuth→Next 15→React 19 — separate maintenance track, carries the outstanding Next.js CVE fixes).

Solo, sequential: ~4.5–5.5 months. With two parallel tracks after Wave 1 (A: 2→3, B: 4→5, then 6→7): ~3–3.5 months. Every wave ships to prod independently.

## Risk register

| Risk | Mitigation |
|------|-----------|
| Engine v2 breaks existing rulesets | Version-by-directive (absent = v1); golden tests copied from real prod rulesets before refactor; TS fallback kept until parity |
| WASM in Node (server actions) misbehaves | `wasm_exec.js` init smoke test in CI; façade falls back to TS engine v1 paths |
| `.apkg` format fiddliness | CSV+media zip ships first; apkg is a fast-follow inside Wave 1 |
| FTS migration locks prod tables | `CREATE INDEX CONCURRENTLY` manual migrations; run at low-traffic window |
| Single-server cron double-fires after PM2 reload | DB claim-with-transaction in Job queue; handlers idempotent |
| Audio storage growth on VPS disk | 1 MB/word cap + per-user quota; monitor via health endpoint; S3 offload only when needed |
| League cold start (few learners) | Cohorts merge tiers below 15 active users; UI degrades to the existing global board |
| Regex search DoS | Server-side pattern validation + statement timeout + rate limit |
| Scope creep inside waves | Each wave gets its own detailed plan with explicit non-goals before execution starts |
