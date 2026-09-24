ALTER TABLE "OboPermitApplicationDocument"
  ADD COLUMN "caseRequirementId" TEXT;

UPDATE "OboPermitApplicationDocument" AS opd
SET "caseRequirementId" = (
  SELECT cr.id
  FROM "OboPermitApplication" AS app
  JOIN "CaseRequirement" AS cr
    ON cr."caseId" = app."caseId"
  JOIN "DocumentRequirement" AS dr
    ON dr.id = opd."requirementId"
  JOIN "RequirementDefinition" AS rd
    ON rd.id = cr."requirementId"
  WHERE app.id = opd."applicationId"
    AND rd.name = dr.name
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OboPermitApplicationDocument"
    WHERE "caseRequirementId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate OBO application documents: one or more checklist rows could not be mapped to a CaseRequirement.';
  END IF;
END $$;

DROP INDEX IF EXISTS "OboPermitApplicationDocument_applicationId_requirementId_key";
DROP INDEX IF EXISTS "OboPermitApplicationDocument_requirementId_idx";

ALTER TABLE "OboPermitApplicationDocument"
  DROP COLUMN "requirementId";

ALTER TABLE "OboPermitApplicationDocument"
  ALTER COLUMN "caseRequirementId" SET NOT NULL;

CREATE UNIQUE INDEX "OboPermitApplicationDocument_applicationId_caseRequirementId_key"
  ON "OboPermitApplicationDocument"("applicationId", "caseRequirementId");

CREATE INDEX "OboPermitApplicationDocument_caseRequirementId_idx"
  ON "OboPermitApplicationDocument"("caseRequirementId");

ALTER TABLE "OboPermitApplicationDocument"
  ADD CONSTRAINT "OboPermitApplicationDocument_caseRequirementId_fkey"
  FOREIGN KEY ("caseRequirementId") REFERENCES "CaseRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OboPermitApplicationDocument"
  ADD CONSTRAINT "OboPermitApplicationDocument_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
