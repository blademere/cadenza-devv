CREATE TABLE "CadenzaOperatingHours" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "weeklyHours" JSONB NOT NULL,
    "dateOverrides" JSONB NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CadenzaOperatingHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaOperatingHours_appId_key" ON "CadenzaOperatingHours"("appId");
ALTER TABLE "CadenzaOperatingHours" ADD CONSTRAINT "CadenzaOperatingHours_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the persisted baseline for every app that already exists.
-- Date overrides remain empty: the 8:00 AM–5:00 PM schedule is the default.
INSERT INTO "CadenzaOperatingHours" ("id", "appId", "weeklyHours", "dateOverrides", "timezone", "createdAt", "updatedAt")
SELECT
  md5('cadenza-operating-hours:' || "id")::uuid,
  "id",
  '{"0":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"1":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"2":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"3":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"4":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"5":{"isClosed":false,"startTime":"08:00","endTime":"17:00"},"6":{"isClosed":false,"startTime":"08:00","endTime":"17:00"}}'::jsonb,
  '{}'::jsonb,
  'Asia/Manila',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "App"
ON CONFLICT ("appId") DO NOTHING;
