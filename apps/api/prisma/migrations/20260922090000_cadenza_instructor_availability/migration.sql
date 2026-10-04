-- CreateTable
CREATE TABLE "CadenzaInstructorAvailability" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaInstructorAvailability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek_startMinute_endMinute_key"
  ON "CadenzaInstructorAvailability"("appId","instructorId","dayOfWeek","startMinute","endMinute");
CREATE INDEX "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek_idx"
  ON "CadenzaInstructorAvailability"("appId","instructorId","dayOfWeek");
ALTER TABLE "CadenzaInstructorAvailability" ADD CONSTRAINT "CadenzaInstructorAvailability_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaInstructorAvailability" ADD CONSTRAINT "CadenzaInstructorAvailability_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaInstructorBlock" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaInstructorBlock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CadenzaInstructorBlock_appId_instructorId_startsAt_endsAt_idx"
  ON "CadenzaInstructorBlock"("appId","instructorId","startsAt","endsAt");
ALTER TABLE "CadenzaInstructorBlock" ADD CONSTRAINT "CadenzaInstructorBlock_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaInstructorBlock" ADD CONSTRAINT "CadenzaInstructorBlock_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
