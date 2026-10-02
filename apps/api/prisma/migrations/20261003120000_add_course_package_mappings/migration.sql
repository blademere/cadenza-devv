CREATE TABLE "CadenzaCoursePackage" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CadenzaCoursePackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaCoursePackage_courseId_packageId_key"
ON "CadenzaCoursePackage"("courseId", "packageId");

CREATE INDEX "CadenzaCoursePackage_appId_packageId_idx"
ON "CadenzaCoursePackage"("appId", "packageId");

CREATE INDEX "CadenzaCoursePackage_appId_courseId_idx"
ON "CadenzaCoursePackage"("appId", "courseId");

INSERT INTO "CadenzaCoursePackage" ("id", "appId", "courseId", "packageId")
SELECT gen_random_uuid()::text, "appId", "id", "packageId"
FROM "CadenzaCourse"
WHERE "packageId" IS NOT NULL;

ALTER TABLE "CadenzaCoursePackage"
ADD CONSTRAINT "CadenzaCoursePackage_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaCoursePackage"
ADD CONSTRAINT "CadenzaCoursePackage_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaCoursePackage"
ADD CONSTRAINT "CadenzaCoursePackage_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
