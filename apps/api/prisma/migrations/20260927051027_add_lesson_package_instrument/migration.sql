ALTER TABLE "CadenzaLessonPackage"
ADD COLUMN "instrument" TEXT;

UPDATE "CadenzaLessonPackage"
SET "instrument" = COALESCE(
  "metadata"->'instruments'->>0,
  'General'
)
WHERE "instrument" IS NULL;

ALTER TABLE "CadenzaLessonPackage"
ALTER COLUMN "instrument" SET NOT NULL;

DROP INDEX IF EXISTS "CadenzaLessonPackage_appId_name_key";

CREATE INDEX "CadenzaLessonPackage_appId_instrument_status_idx"
ON "CadenzaLessonPackage"("appId", "instrument", "status");

CREATE UNIQUE INDEX "CadenzaLessonPackage_appId_name_instrument_key"
ON "CadenzaLessonPackage"("appId", "name", "instrument");