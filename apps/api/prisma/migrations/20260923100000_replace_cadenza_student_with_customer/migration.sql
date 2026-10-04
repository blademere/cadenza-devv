-- Replace the redundant CadenzaStudent role with the existing CadenzaCustomer.
-- Existing student identities are preserved by materializing/merging their Person
-- references into CadenzaCustomer before moving enrollments.

ALTER TABLE "CadenzaEnrollment"
  ADD COLUMN "customerId" TEXT;

INSERT INTO "CadenzaCustomer" ("id", "appId", "personId", "status", "metadata", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  s."appId",
  s."personId",
  s."status",
  s."metadata",
  s."createdAt",
  s."updatedAt"
FROM "CadenzaStudent" s
ON CONFLICT ("appId", "personId") DO NOTHING;

UPDATE "CadenzaEnrollment" e
SET "customerId" = c."id"
FROM "CadenzaStudent" s
JOIN "CadenzaCustomer" c
  ON c."appId" = s."appId"
 AND c."personId" = s."personId"
WHERE e."studentId" = s."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CadenzaEnrollment" WHERE "customerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate Cadenza enrollments: customer could not be resolved from student.';
  END IF;
END $$;

ALTER TABLE "CadenzaEnrollment"
  ALTER COLUMN "customerId" SET NOT NULL;

ALTER TABLE "CadenzaEnrollment"
  ADD CONSTRAINT "CadenzaEnrollment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "CadenzaEnrollment_appId_studentId_status";
DROP INDEX IF EXISTS "CadenzaEnrollment_appId_studentId_lessonPackageId";

ALTER TABLE "CadenzaEnrollment"
  DROP CONSTRAINT IF EXISTS "CadenzaEnrollment_studentId_fkey";

CREATE INDEX "CadenzaEnrollment_appId_customerId_status"
  ON "CadenzaEnrollment"("appId", "customerId", "status");

CREATE UNIQUE INDEX "CadenzaEnrollment_appId_customerId_lessonPackageId_key"
  ON "CadenzaEnrollment"("appId", "customerId", "lessonPackageId");

ALTER TABLE "CadenzaEnrollment"
  DROP COLUMN "studentId";

DROP TABLE "CadenzaStudent";
