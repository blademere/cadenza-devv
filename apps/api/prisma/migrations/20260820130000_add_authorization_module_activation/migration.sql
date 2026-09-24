-- Add a platform-level module switch. Permissions remain role-scoped;
-- disabled modules are excluded from authorization resolution for every role.
ALTER TABLE "Module"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
