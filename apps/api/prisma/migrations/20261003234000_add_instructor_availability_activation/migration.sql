ALTER TABLE "CadenzaInstructorAvailability"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "CadenzaInstructorAvailability_appId_instructorId_isActive_idx"
  ON "CadenzaInstructorAvailability"("appId", "instructorId", "isActive");
