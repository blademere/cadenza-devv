-- Phase 12: Audit records carry application context so activity is unambiguous
-- when a global user belongs to multiple applications.
ALTER TABLE "AuditLog"
  ADD COLUMN "appId" TEXT;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "AuditLog_appId_createdAt_idx"
  ON "AuditLog"("appId", "createdAt");

CREATE INDEX "AuditLog_appId_entityType_entityId_createdAt_idx"
  ON "AuditLog"("appId", "entityType", "entityId", "createdAt");
