-- Required for the trigram (gin_trgm_ops) indexes below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "dictionary_entries" ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "grammar_pages" ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "languages" ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "texts" ADD COLUMN     "searchVector" tsvector;

-- CreateIndex
CREATE INDEX "articles_searchVector_idx" ON "articles" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "dictionary_entries_searchVector_idx" ON "dictionary_entries" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "dictionary_entries_lemma_idx" ON "dictionary_entries" USING GIN ("lemma" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "dictionary_entries_ipa_idx" ON "dictionary_entries" USING GIN ("ipa" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "grammar_pages_searchVector_idx" ON "grammar_pages" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "languages_searchVector_idx" ON "languages" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "texts_searchVector_idx" ON "texts" USING GIN ("searchVector");

-- Maintain searchVector via triggers ('simple' config: no stemming — conlang-safe).
-- Triggers rather than GENERATED columns: Prisma cannot represent a generation
-- expression, so a generated column makes `migrate dev` detect perpetual drift and
-- demand a fix-up migration. Prisma does not diff functions/triggers, so this stays
-- drift-free while keeping the vectors always up to date.
CREATE OR REPLACE FUNCTION languages_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."name", '') || ' ' || coalesce(NEW."description", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER languages_search_vector_update BEFORE INSERT OR UPDATE ON "languages"
  FOR EACH ROW EXECUTE FUNCTION languages_search_vector_trigger();

CREATE OR REPLACE FUNCTION dictionary_entries_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."lemma", '') || ' ' || coalesce(NEW."gloss", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER dictionary_entries_search_vector_update BEFORE INSERT OR UPDATE ON "dictionary_entries"
  FOR EACH ROW EXECUTE FUNCTION dictionary_entries_search_vector_trigger();

CREATE OR REPLACE FUNCTION grammar_pages_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."title", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER grammar_pages_search_vector_update BEFORE INSERT OR UPDATE ON "grammar_pages"
  FOR EACH ROW EXECUTE FUNCTION grammar_pages_search_vector_trigger();

CREATE OR REPLACE FUNCTION articles_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."title", '') || ' ' || coalesce(NEW."excerpt", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER articles_search_vector_update BEFORE INSERT OR UPDATE ON "articles"
  FOR EACH ROW EXECUTE FUNCTION articles_search_vector_trigger();

CREATE OR REPLACE FUNCTION texts_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."title", '') || ' ' || coalesce(NEW."description", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER texts_search_vector_update BEFORE INSERT OR UPDATE ON "texts"
  FOR EACH ROW EXECUTE FUNCTION texts_search_vector_trigger();

-- Backfill existing rows.
UPDATE "languages" SET "searchVector" = to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''));
UPDATE "dictionary_entries" SET "searchVector" = to_tsvector('simple', coalesce("lemma", '') || ' ' || coalesce("gloss", ''));
UPDATE "grammar_pages" SET "searchVector" = to_tsvector('simple', coalesce("title", ''));
UPDATE "articles" SET "searchVector" = to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("excerpt", ''));
UPDATE "texts" SET "searchVector" = to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''));
