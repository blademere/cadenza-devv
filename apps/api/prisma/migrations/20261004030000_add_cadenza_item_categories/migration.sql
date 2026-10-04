CREATE TABLE "CadenzaItemCategory" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaItemCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaItemCategory_appId_name_key"
  ON "CadenzaItemCategory"("appId", "name");
CREATE INDEX "CadenzaItemCategory_appId_status_idx"
  ON "CadenzaItemCategory"("appId", "status");

ALTER TABLE "CadenzaItemCategory"
  ADD CONSTRAINT "CadenzaItemCategory_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
