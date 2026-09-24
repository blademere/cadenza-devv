-- Phase 10 completion: application memberships are the sole source of user roles.
ALTER TABLE "ApprovalInstance"
  ADD COLUMN IF NOT EXISTS "appId" TEXT;

CREATE INDEX IF NOT EXISTS "ApprovalInstance_appId_status_idx"
  ON "ApprovalInstance" ("appId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalInstance_appId_fkey'
  ) THEN
    ALTER TABLE "ApprovalInstance"
      ADD CONSTRAINT "ApprovalInstance_appId_fkey"
      FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_roleId_fkey";

DROP INDEX IF EXISTS "User_roleId_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "roleId";
