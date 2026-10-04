CREATE TABLE "CadenzaInstrumentType" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaInstrumentType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaInstrumentType_appId_name_key"
  ON "CadenzaInstrumentType"("appId", "name");
CREATE INDEX "CadenzaInstrumentType_appId_status_idx"
  ON "CadenzaInstrumentType"("appId", "status");

ALTER TABLE "CadenzaInstrumentType"
  ADD CONSTRAINT "CadenzaInstrumentType_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
