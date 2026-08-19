-- OBO permit lifecycle is owned exclusively by the platform Workflow engine.
-- CaseRecord.status remains a case-container lifecycle and is initialized to OPEN.

DROP INDEX IF EXISTS "OboPermitApplication_status_createdAt_idx";
DROP INDEX IF EXISTS "OboPermitApplication_permitTypeId_status_idx";

ALTER TABLE "OboPermitApplication"
DROP COLUMN IF EXISTS "status";
