-- Phase 10 completion: application memberships are the sole source of user roles.
ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_roleId_fkey";

DROP INDEX IF EXISTS "User_roleId_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "roleId";
