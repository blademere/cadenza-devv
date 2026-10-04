ALTER TABLE "OboPermitApplication"
ADD COLUMN "replacesApplicationId" TEXT;

CREATE INDEX "OboPermitApplication_replacesApplicationId_idx"
ON "OboPermitApplication"("replacesApplicationId");

ALTER TABLE "OboPermitApplication"
ADD CONSTRAINT "OboPermitApplication_replacesApplicationId_fkey"
FOREIGN KEY ("replacesApplicationId") REFERENCES "OboPermitApplication"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
