ALTER TABLE "CadenzaInstrument"
ADD COLUMN "itemCategoryId" TEXT;

CREATE INDEX "CadenzaInstrument_itemCategoryId_idx"
ON "CadenzaInstrument"("itemCategoryId");

ALTER TABLE "CadenzaInstrument"
ADD CONSTRAINT "CadenzaInstrument_itemCategoryId_fkey"
FOREIGN KEY ("itemCategoryId") REFERENCES "CadenzaItemCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
