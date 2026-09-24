-- Add PRC and PTR credentials required for OBO professional verification.
-- Nullable columns preserve existing professional records; the application service
-- requires both values for all new verification submissions.
ALTER TABLE "OboProfessional"
ADD COLUMN "prcId" TEXT,
ADD COLUMN "ptrNumber" TEXT;

CREATE UNIQUE INDEX "OboProfessional_prcId_key"
ON "OboProfessional"("prcId");

CREATE INDEX "OboProfessional_ptrNumber_idx"
ON "OboProfessional"("ptrNumber");
