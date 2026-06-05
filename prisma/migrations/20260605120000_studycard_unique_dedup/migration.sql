-- Remove duplicate vocab study cards, keeping the earliest per
-- (enrollmentId, dictEntryId, cardType). Cards with a NULL dictEntryId
-- (e.g. future cloze/grammar cards) are left untouched.
DELETE FROM "study_cards"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
      ROW_NUMBER() OVER (
        PARTITION BY "enrollmentId", "dictEntryId", "cardType"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS rn
    FROM "study_cards"
    WHERE "dictEntryId" IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
);

-- Enforce uniqueness so createMany(skipDuplicates) actually prevents dupes.
-- NULL dictEntryId values remain distinct in Postgres, so non-vocab cards are unaffected.
CREATE UNIQUE INDEX "study_cards_enrollmentId_dictEntryId_cardType_key"
ON "study_cards" ("enrollmentId", "dictEntryId", "cardType");
