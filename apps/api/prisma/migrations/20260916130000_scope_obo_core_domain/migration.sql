-- Phase 2: establish explicit OBO application ownership for core domain records.
-- Existing OBO records are backfilled from the authoritative App row keyed by 'obo'.

ALTER TABLE "OboPermitType" ADD COLUMN "appId" TEXT;
ALTER TABLE "OboPermitApplication" ADD COLUMN "appId" TEXT;
ALTER TABLE "OboProfessional" ADD COLUMN "appId" TEXT;

UPDATE "OboPermitType"
SET "appId" = (SELECT "id" FROM "App" WHERE "key" = 'obo' LIMIT 1)
WHERE "appId" IS NULL;

UPDATE "OboPermitApplication"
SET "appId" = (SELECT "id" FROM "App" WHERE "key" = 'obo' LIMIT 1)
WHERE "appId" IS NULL;

UPDATE "OboProfessional"
SET "appId" = (SELECT "id" FROM "App" WHERE "key" = 'obo' LIMIT 1)
WHERE "appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OboPermitType" WHERE "appId" IS NULL)
     OR EXISTS (SELECT 1 FROM "OboPermitApplication" WHERE "appId" IS NULL)
     OR EXISTS (SELECT 1 FROM "OboProfessional" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope OBO core records: application key ''obo'' is missing or records remain unowned.';
  END IF;
END $$;

ALTER TABLE "OboPermitType" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "OboPermitApplication" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "OboProfessional" ALTER COLUMN "appId" SET NOT NULL;

DROP INDEX IF EXISTS "OboPermitType_key_key";
DROP INDEX IF EXISTS "OboPermitApplication_referenceNumber_key";
DROP INDEX IF EXISTS "OboProfessional_personId_key";
DROP INDEX IF EXISTS "OboProfessional_registrationNumber_key";
DROP INDEX IF EXISTS "OboProfessional_prcId_key";

CREATE UNIQUE INDEX "OboPermitType_appId_key_key" ON "OboPermitType"("appId", "key");
CREATE UNIQUE INDEX "OboPermitApplication_appId_referenceNumber_key" ON "OboPermitApplication"("appId", "referenceNumber");
CREATE UNIQUE INDEX "OboProfessional_appId_personId_key" ON "OboProfessional"("appId", "personId");
CREATE UNIQUE INDEX "OboProfessional_appId_registrationNumber_key" ON "OboProfessional"("appId", "registrationNumber");

CREATE INDEX "OboPermitType_appId_idx" ON "OboPermitType"("appId");
CREATE INDEX "OboPermitType_appId_isActive_idx" ON "OboPermitType"("appId", "isActive");
CREATE INDEX "OboPermitApplication_appId_idx" ON "OboPermitApplication"("appId");
CREATE INDEX "OboPermitApplication_appId_clientPersonId_createdAt_idx" ON "OboPermitApplication"("appId", "clientPersonId", "createdAt");
CREATE INDEX "OboPermitApplication_appId_permitTypeId_idx" ON "OboPermitApplication"("appId", "permitTypeId");
CREATE INDEX "OboProfessional_appId_idx" ON "OboProfessional"("appId");
CREATE INDEX "OboProfessional_appId_status_idx" ON "OboProfessional"("appId", "status");

ALTER TABLE "OboPermitType"
  ADD CONSTRAINT "OboPermitType_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OboPermitApplication"
  ADD CONSTRAINT "OboPermitApplication_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OboProfessional"
  ADD CONSTRAINT "OboProfessional_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
