ALTER TABLE "Form" ADD COLUMN "appId" TEXT;

UPDATE "Form" AS f
SET "appId" = a."id"
FROM "App" AS a
WHERE a."key" = 'obo'
  AND f."appId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Form" WHERE "appId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete form application ownership migration: one or more Form rows have no authoritative application owner';
  END IF;
END $$;

ALTER TABLE "Form" ALTER COLUMN "appId" SET NOT NULL;

CREATE INDEX "Form_appId_idx" ON "Form"("appId");
CREATE INDEX "Form_appId_isActive_idx" ON "Form"("appId", "isActive");
CREATE UNIQUE INDEX "Form_id_appId_key" ON "Form"("id", "appId");

ALTER TABLE "Form"
  ADD CONSTRAINT "Form_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Child form records inherit application ownership through Form -> FormVersion.
-- No duplicated appId columns are introduced on versions, sections, fields,
-- options, or submissions in this phase.
