ALTER TABLE "CadenzaLessonPackage" ADD COLUMN "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "CadenzaLessonPackage" ADD COLUMN "sessionsPerWeek" INTEGER NOT NULL DEFAULT 1;
