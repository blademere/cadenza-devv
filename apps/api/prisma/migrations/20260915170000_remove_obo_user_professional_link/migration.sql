-- Phase 11: User remains a global identity; OBO professional ownership is resolved through Person.
ALTER TABLE "OboProfessional"
  DROP CONSTRAINT IF EXISTS "OboProfessional_userId_fkey";

DROP INDEX IF EXISTS "OboProfessional_userId_key";

ALTER TABLE "OboProfessional"
  DROP COLUMN IF EXISTS "userId";
