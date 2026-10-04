-- Phase 5: make appointment types and appointments explicitly application-owned.
-- AvailabilitySchedule and AppointmentSlot inherit ownership through AppointmentType.
-- Existing appointment data is currently used by OBO, so ownership is backfilled
-- from the authoritative OBO App rather than from user identity.

ALTER TABLE "AppointmentType" ADD COLUMN "appId" TEXT;

UPDATE "AppointmentType" AS t
SET "appId" = a."id"
FROM "App" AS a
WHERE a."key" = 'obo'
  AND t."appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AppointmentType" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Phase 5 migration blocked: one or more appointment types have no authoritative application owner';
  END IF;
END $$;

ALTER TABLE "AppointmentType" ALTER COLUMN "appId" SET NOT NULL;
CREATE INDEX "AppointmentType_appId_idx" ON "AppointmentType"("appId");
CREATE INDEX "AppointmentType_appId_isActive_idx" ON "AppointmentType"("appId", "isActive");

-- Replace the legacy global unique constraint with application-scoped uniqueness.
DROP INDEX IF EXISTS "AppointmentType_key_key";
CREATE UNIQUE INDEX "AppointmentType_appId_key_key"
  ON "AppointmentType"("appId", "key");

ALTER TABLE "Appointment"
  ADD COLUMN "appId" TEXT;

UPDATE "Appointment" AS ap
SET "appId" = t."appId"
FROM "AppointmentType" AS t
WHERE t."id" = ap."appointmentTypeId"
  AND ap."appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Appointment" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Phase 5 migration blocked: one or more appointments have no authoritative application owner';
  END IF;
END $$;

ALTER TABLE "Appointment" ALTER COLUMN "appId" SET NOT NULL;
CREATE INDEX "Appointment_appId_idx" ON "Appointment"("appId");
CREATE INDEX "Appointment_appId_slotId_status_idx" ON "Appointment"("appId", "slotId", "status");
CREATE INDEX "Appointment_appId_userId_createdAt_idx" ON "Appointment"("appId", "userId", "createdAt");
CREATE INDEX "Appointment_appId_status_createdAt_idx" ON "Appointment"("appId", "status", "createdAt");
CREATE INDEX "Appointment_appId_appointmentTypeId_status_idx" ON "Appointment"("appId", "appointmentTypeId", "status");

-- Replace the legacy global reference-number uniqueness with application-scoped uniqueness.
DROP INDEX IF EXISTS "Appointment_referenceNumber_key";
CREATE UNIQUE INDEX "Appointment_appId_referenceNumber_key"
  ON "Appointment"("appId", "referenceNumber");

ALTER TABLE "AppointmentType"
  ADD CONSTRAINT "AppointmentType_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
