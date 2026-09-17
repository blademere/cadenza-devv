-- Phase 3: CaseRecord application ownership.
-- Ownership is derived from the authoritative OBO permit application -> App relationship.
-- Global caseNumber uniqueness is intentionally retained for Phase 13.

ALTER TABLE "CaseRecord"
  ADD COLUMN "appId" TEXT;

UPDATE "CaseRecord" AS c
SET "appId" = a."id"
FROM "OboPermitApplication" AS p
JOIN "App" AS a ON a."key" = 'obo'
WHERE p."caseId" = c."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CaseRecord" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete case application ownership migration: one or more CaseRecord rows have no authoritative application owner';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "App" WHERE "key" = 'obo') THEN
    RAISE EXCEPTION 'Cannot complete case application ownership migration: OBO App does not exist';
  END IF;
END $$;

ALTER TABLE "CaseRecord"
  ALTER COLUMN "appId" SET NOT NULL;

CREATE INDEX "CaseRecord_appId_idx" ON "CaseRecord"("appId");
CREATE INDEX "CaseRecord_appId_caseTypeId_status_idx" ON "CaseRecord"("appId", "caseTypeId", "status");
CREATE INDEX "CaseRecord_appId_status_createdAt_idx" ON "CaseRecord"("appId", "status", "createdAt");

ALTER TABLE "CaseRecord"
  ADD CONSTRAINT "CaseRecord_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
