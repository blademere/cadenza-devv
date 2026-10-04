-- Keep Cadenza business/workflow actions person-backed.
-- Customer rentals and student enrollments already resolve to Person through
-- CadenzaCustomer/CadenzaStudent. This migration removes direct User identity
-- storage from lesson workflow records.

ALTER TABLE "CadenzaAttendance"
  ADD COLUMN "markedByPersonId" TEXT;

UPDATE "CadenzaAttendance" a
SET "markedByPersonId" = p."id"
FROM "Person" p
WHERE a."markedByUserId" = p."userId";

ALTER TABLE "CadenzaAttendance"
  ADD CONSTRAINT "CadenzaAttendance_markedByPersonId_fkey"
  FOREIGN KEY ("markedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CadenzaAttendance_markedByPersonId_idx"
  ON "CadenzaAttendance"("markedByPersonId");

ALTER TABLE "CadenzaAttendance"
  DROP COLUMN "markedByUserId";

ALTER TABLE "CadenzaRescheduleRequest"
  ADD COLUMN "requestedByPersonId" TEXT,
  ADD COLUMN "reviewedByPersonId" TEXT;

UPDATE "CadenzaRescheduleRequest" r
SET "requestedByPersonId" = p."id"
FROM "Person" p
WHERE r."requestedByUserId" = p."userId";

UPDATE "CadenzaRescheduleRequest" r
SET "reviewedByPersonId" = p."id"
FROM "Person" p
WHERE r."reviewedByUserId" = p."userId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CadenzaRescheduleRequest"
    WHERE "requestedByPersonId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate Cadenza reschedule requests: requested user has no Person record.';
  END IF;
END $$;

ALTER TABLE "CadenzaRescheduleRequest"
  ALTER COLUMN "requestedByPersonId" SET NOT NULL;

ALTER TABLE "CadenzaRescheduleRequest"
  ADD CONSTRAINT "CadenzaRescheduleRequest_requestedByPersonId_fkey"
  FOREIGN KEY ("requestedByPersonId") REFERENCES "Person"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CadenzaRescheduleRequest"
  ADD CONSTRAINT "CadenzaRescheduleRequest_reviewedByPersonId_fkey"
  FOREIGN KEY ("reviewedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CadenzaRescheduleRequest_requestedByPersonId_idx"
  ON "CadenzaRescheduleRequest"("requestedByPersonId");

CREATE INDEX "CadenzaRescheduleRequest_reviewedByPersonId_idx"
  ON "CadenzaRescheduleRequest"("reviewedByPersonId");

ALTER TABLE "CadenzaRescheduleRequest"
  DROP COLUMN "requestedByUserId",
  DROP COLUMN "reviewedByUserId";
