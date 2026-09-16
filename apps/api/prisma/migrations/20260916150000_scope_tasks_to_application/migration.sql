-- Phase 4: make shared tasks explicitly application-owned.
-- Ownership is derived from the authoritative CaseRecord relationship.
-- Tasks without a case are not assigned an owner by inference.

ALTER TABLE "Task"
  ADD COLUMN "appId" TEXT;

UPDATE "Task" AS t
SET "appId" = c."appId"
FROM "CaseRecord" AS c
WHERE t."caseId" = c."id"
  AND t."appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Task" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete task application ownership migration: one or more Task rows have no authoritative application owner';
  END IF;
END $$;

ALTER TABLE "Task"
  ALTER COLUMN "appId" SET NOT NULL;

CREATE INDEX "Task_appId_idx" ON "Task"("appId");
CREATE INDEX "Task_appId_caseId_status_idx" ON "Task"("appId", "caseId", "status");
CREATE INDEX "Task_appId_assigneeUserId_status_idx" ON "Task"("appId", "assigneeUserId", "status");
CREATE INDEX "Task_appId_status_dueAt_idx" ON "Task"("appId", "status", "dueAt");

-- The composite reference makes the database enforce:
-- Task.appId == CaseRecord.appId whenever caseId is present.
CREATE UNIQUE INDEX "CaseRecord_id_appId_key" ON "CaseRecord"("id", "appId");

ALTER TABLE "Task"
  DROP CONSTRAINT IF EXISTS "Task_caseId_fkey";

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_caseId_appId_fkey"
  FOREIGN KEY ("caseId", "appId") REFERENCES "CaseRecord"("id", "appId")
  ON DELETE SET NULL ON UPDATE CASCADE;
