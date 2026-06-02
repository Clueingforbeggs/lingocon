-- AlterTable
ALTER TABLE "language_collaborators" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: give existing EDITOR collaborators the full default permission set
UPDATE "language_collaborators"
SET "permissions" = ARRAY[
  'write:dictionary',
  'write:grammar',
  'write:alphabet',
  'write:phonology',
  'write:paradigms',
  'write:articles',
  'write:texts',
  'write:settings',
  'manage:modules'
]
WHERE "role" = 'EDITOR';
