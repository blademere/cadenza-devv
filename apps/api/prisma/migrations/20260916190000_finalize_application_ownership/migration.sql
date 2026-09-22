-- Phase 18: controlled application-ownership finalization.
--
-- This migration is deliberately fail-closed. Ownership is backfilled only from
-- authoritative domain relationships; it is never inferred from a user, actor,
-- or other identity. Ambiguous or contradictory ownership stops the migration.

UPDATE "OboPermitType" pt
SET "appId" = a."id"
FROM "App" a
WHERE a."key" = 'obo'
  AND pt."appId" IS NULL;

UPDATE "OboPermitApplication" p
SET "appId" = a."id"
FROM "App" a
WHERE a."key" = 'obo'
  AND p."appId" IS NULL;

UPDATE "OboProfessional" p
SET "appId" = a."id"
FROM "App" a
WHERE a."key" = 'obo'
  AND p."appId" IS NULL;

UPDATE "CaseRecord" c
SET "appId" = p."appId"
FROM "OboPermitApplication" p
WHERE p."caseId" = c."id"
  AND c."appId" IS NULL;

UPDATE "Task" t
SET "appId" = c."appId"
FROM "CaseRecord" c
WHERE t."caseId" = c."id"
  AND t."appId" IS NULL;

UPDATE "Appointment" a
SET "appId" = p."appId"
FROM "OboSubmissionAppointment" osa
JOIN "OboPermitApplication" p ON p."id" = osa."applicationId"
WHERE osa."appointmentId" = a."id"
  AND a."appId" IS NULL;

UPDATE "AppointmentType" at
SET "appId" = a."appId"
FROM "Appointment" a
WHERE a."appointmentTypeId" = at."id"
  AND at."appId" IS NULL;

UPDATE "Form" f
SET "appId" = pt."appId"
FROM "OboPermitType" pt
WHERE pt."formId" = f."id"
  AND f."appId" IS NULL;

UPDATE "RequirementDefinition" r
SET "appId" = c."appId"
FROM "CaseRequirement" cr
JOIN "CaseRecord" c ON c."id" = cr."caseId"
WHERE cr."requirementId" = r."id"
  AND r."appId" IS NULL;

UPDATE "RequirementDefinition" r
SET "appId" = pt."appId"
FROM "OboPermitTypeRequirement" ptr
JOIN "OboPermitType" pt ON pt."id" = ptr."permitTypeId"
WHERE ptr."requirementId" = r."id"
  AND r."appId" IS NULL;

DO $$
DECLARE
  missing_count bigint;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM "CaseRecord" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % CaseRecord rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "Task" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % Task rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "AppointmentType" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % AppointmentType rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "Appointment" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % Appointment rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "RequirementDefinition" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % RequirementDefinition rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "Form" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % Form rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "OboPermitType" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OboPermitType rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "OboPermitApplication" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OboPermitApplication rows have no appId.', missing_count; END IF;
  SELECT COUNT(*) INTO missing_count FROM "OboProfessional" WHERE "appId" IS NULL;
  IF missing_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OboProfessional rows have no appId.', missing_count; END IF;
END $$;

DO $$
DECLARE
  mismatch_count bigint;
BEGIN
  SELECT COUNT(*) INTO mismatch_count FROM "Task" t JOIN "CaseRecord" c ON c."id" = t."caseId" WHERE t."caseId" IS NOT NULL AND t."appId" <> c."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % Task rows cross application boundaries through caseId.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "Appointment" a JOIN "AppointmentType" at ON at."id" = a."appointmentTypeId" WHERE a."appId" <> at."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % Appointment rows cross application boundaries through appointmentTypeId.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "OboPermitApplication" p JOIN "CaseRecord" c ON c."id" = p."caseId" WHERE p."appId" <> c."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OBO permit applications point to a case owned by another application.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "OboPermitApplication" p JOIN "OboPermitType" pt ON pt."id" = p."permitTypeId" WHERE p."appId" <> pt."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OBO permit applications point to a permit type owned by another application.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "OboPermitType" pt JOIN "Form" f ON f."id" = pt."formId" WHERE pt."formId" IS NOT NULL AND pt."appId" <> f."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OBO permit types point to a form owned by another application.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "CaseRequirement" cr JOIN "CaseRecord" c ON c."id" = cr."caseId" JOIN "RequirementDefinition" r ON r."id" = cr."requirementId" WHERE c."appId" <> r."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % case requirements cross application boundaries.', mismatch_count; END IF;
  SELECT COUNT(*) INTO mismatch_count FROM "OboPermitTypeRequirement" ptr JOIN "OboPermitType" pt ON pt."id" = ptr."permitTypeId" JOIN "RequirementDefinition" r ON r."id" = ptr."requirementId" WHERE pt."appId" <> r."appId";
  IF mismatch_count > 0 THEN RAISE EXCEPTION 'Phase 18 ownership validation failed: % OBO permit-type requirements cross application boundaries.', mismatch_count; END IF;
END $$;

ALTER TABLE "CaseRecord" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "AppointmentType" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "RequirementDefinition" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "Form" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "OboPermitType" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "OboPermitApplication" ALTER COLUMN "appId" SET NOT NULL;
ALTER TABLE "OboProfessional" ALTER COLUMN "appId" SET NOT NULL;

-- Composite foreign keys require matching unique constraints on the parent.
-- CaseRecord already receives this key from the Phase 13 migration. OboPermitType
-- needs its corresponding (id, appId) key here before the final FK is added.
CREATE UNIQUE INDEX IF NOT EXISTS "OboPermitType_id_appId_key"
  ON "OboPermitType" ("id", "appId");

ALTER TABLE "OboPermitApplication"
  DROP CONSTRAINT IF EXISTS "OboPermitApplication_caseId_fkey";
ALTER TABLE "OboPermitApplication"
  ADD CONSTRAINT "OboPermitApplication_caseId_appId_fkey"
  FOREIGN KEY ("caseId", "appId")
  REFERENCES "CaseRecord" ("id", "appId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OboPermitApplication"
  DROP CONSTRAINT IF EXISTS "OboPermitApplication_permitTypeId_fkey";
ALTER TABLE "OboPermitApplication"
  ADD CONSTRAINT "OboPermitApplication_permitTypeId_appId_fkey"
  FOREIGN KEY ("permitTypeId", "appId")
  REFERENCES "OboPermitType" ("id", "appId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
