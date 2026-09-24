-- Phase 6: requirement definitions are application-owned; CaseRequirement
-- inherits ownership from its CaseRecord.

ALTER TABLE "RequirementDefinition" ADD COLUMN "appId" TEXT;

UPDATE "RequirementDefinition" AS r
SET "appId" = a."id"
FROM "App" AS a
WHERE a."key" = 'obo'
  AND r."appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "RequirementDefinition" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Phase 6 migration blocked: one or more requirement definitions have no authoritative application owner';
  END IF;
END $$;

ALTER TABLE "RequirementDefinition" ALTER COLUMN "appId" SET NOT NULL;
CREATE INDEX "RequirementDefinition_appId_idx" ON "RequirementDefinition"("appId");
CREATE INDEX "RequirementDefinition_appId_isActive_idx" ON "RequirementDefinition"("appId", "isActive");

DROP INDEX IF EXISTS "RequirementDefinition_key_key";
CREATE UNIQUE INDEX "RequirementDefinition_appId_key_key"
  ON "RequirementDefinition"("appId", "key");
CREATE UNIQUE INDEX "RequirementDefinition_id_appId_key"
  ON "RequirementDefinition"("id", "appId");

ALTER TABLE "RequirementDefinition"
  ADD CONSTRAINT "RequirementDefinition_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CaseRequirement ownership remains inherited from CaseRecord. The service
-- layer requires the same appId for both the case and requirement definition;
-- no duplicated appId is introduced into CaseRequirement.
