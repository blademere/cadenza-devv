CREATE TABLE "CadenzaInstructorCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructorCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaInstructorCourse_appId_instructorId_courseId_key"
  ON "CadenzaInstructorCourse"("appId", "instructorId", "courseId");

CREATE INDEX "CadenzaInstructorCourse_appId_courseId_status_idx"
  ON "CadenzaInstructorCourse"("appId", "courseId", "status");

CREATE INDEX "CadenzaInstructorCourse_appId_instructorId_status_idx"
  ON "CadenzaInstructorCourse"("appId", "instructorId", "status");

ALTER TABLE "CadenzaInstructorCourse"
  ADD CONSTRAINT "CadenzaInstructorCourse_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaInstructorCourse"
  ADD CONSTRAINT "CadenzaInstructorCourse_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaInstructorCourse"
  ADD CONSTRAINT "CadenzaInstructorCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing manually entered specializations when their text exactly
-- matches an active course name.
INSERT INTO "CadenzaInstructorCourse" ("id", "appId", "instructorId", "courseId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, specialty."appId", specialty."instructorId", course."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CadenzaInstructorSpecialty" specialty
JOIN "CadenzaCourse" course
  ON course."appId" = specialty."appId"
 AND UPPER(TRIM(course."name")) = UPPER(TRIM(specialty."instrumentType"))
WHERE course."status" = 'ACTIVE'
ON CONFLICT ("appId", "instructorId", "courseId") DO NOTHING;
