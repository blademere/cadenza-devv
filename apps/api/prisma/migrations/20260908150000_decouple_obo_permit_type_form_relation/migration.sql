-- Keep OBO's formId as a scalar integration reference while removing the Prisma cross-domain relation.
ALTER TABLE "OboPermitType"
  DROP CONSTRAINT IF EXISTS "OboPermitType_formId_fkey";
