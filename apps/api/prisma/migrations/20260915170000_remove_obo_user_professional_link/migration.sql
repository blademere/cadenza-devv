-- Phase 11: User remains a global identity; OBO professional ownership is resolved through Person.
ALTER TABLE "OboProfessional"
  DROP COLUMN IF EXISTS "userId" CASCADE;
