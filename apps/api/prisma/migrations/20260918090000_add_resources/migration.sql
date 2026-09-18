CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Resource_appId_key_key" ON "Resource" ("appId", "key");
CREATE INDEX "Resource_appId_status_idx" ON "Resource" ("appId", "status");
CREATE INDEX "Resource_appId_type_idx" ON "Resource" ("appId", "type");
CREATE INDEX "Resource_appId_name_idx" ON "Resource" ("appId", "name");

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
