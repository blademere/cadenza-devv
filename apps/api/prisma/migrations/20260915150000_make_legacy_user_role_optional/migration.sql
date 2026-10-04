-- Phase 10 transitional migration.
-- AppMembershipRole is now the authoritative application role source.
-- Keep the legacy role column nullable until the seed fixtures are migrated
-- and the final legacy-security cleanup removes it.
ALTER TABLE "User"
  ALTER COLUMN "roleId" DROP NOT NULL;
