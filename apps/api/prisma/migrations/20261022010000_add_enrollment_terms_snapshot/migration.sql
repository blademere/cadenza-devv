ALTER TABLE "CadenzaEnrollment"
ADD COLUMN "packageNameAtEnrollment" TEXT,
ADD COLUMN "numberOfSessionsAtEnrollment" INTEGER,
ADD COLUMN "sessionDurationMinutesAtEnrollment" INTEGER,
ADD COLUMN "sessionsPerWeekAtEnrollment" INTEGER,
ADD COLUMN "termsSnapshot" JSONB;

UPDATE "CadenzaEnrollment" AS enrollment
SET
  "packageNameAtEnrollment" = package."name",
  "numberOfSessionsAtEnrollment" = package."numberOfSessions",
  "sessionDurationMinutesAtEnrollment" = package."sessionDurationMinutes",
  "sessionsPerWeekAtEnrollment" = package."sessionsPerWeek",
  "termsSnapshot" = jsonb_build_object(
    'packageId', package."id",
    'packageName', package."name",
    'price', package."price",
    'numberOfSessions', package."numberOfSessions",
    'sessionDurationMinutes', package."sessionDurationMinutes",
    'sessionsPerWeek', package."sessionsPerWeek"
  )
FROM "CadenzaLessonPackage" AS package
WHERE enrollment."lessonPackageId" = package."id";

ALTER TABLE "CadenzaEnrollment"
ALTER COLUMN "packageNameAtEnrollment" SET NOT NULL,
ALTER COLUMN "numberOfSessionsAtEnrollment" SET NOT NULL,
ALTER COLUMN "sessionDurationMinutesAtEnrollment" SET NOT NULL,
ALTER COLUMN "sessionsPerWeekAtEnrollment" SET NOT NULL;
