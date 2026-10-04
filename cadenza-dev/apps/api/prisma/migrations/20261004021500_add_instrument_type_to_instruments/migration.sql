ALTER TABLE "CadenzaInstrument"
ADD COLUMN "instrumentTypeId" TEXT;

CREATE INDEX "CadenzaInstrument_appId_instrumentTypeId_idx"
  ON "CadenzaInstrument"("appId", "instrumentTypeId");

ALTER TABLE "CadenzaInstrument"
  ADD CONSTRAINT "CadenzaInstrument_instrumentTypeId_fkey"
  FOREIGN KEY ("instrumentTypeId") REFERENCES "CadenzaInstrumentType"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
