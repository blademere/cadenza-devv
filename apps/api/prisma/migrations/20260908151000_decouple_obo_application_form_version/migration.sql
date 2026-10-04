-- Keep OBO's formVersionId as a scalar integration reference while removing the Prisma cross-domain relation.
ALTER TABLE "OboPermitApplication"
  DROP CONSTRAINT IF EXISTS "OboPermitApplication_formVersionId_fkey";

CREATE INDEX IF NOT EXISTS "OboPermitApplication_formVersionId_idx"
  ON "OboPermitApplication"("formVersionId");
