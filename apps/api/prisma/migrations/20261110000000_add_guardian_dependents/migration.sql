ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "Person" ADD COLUMN "age" INTEGER;
ALTER TABLE "Person" ADD COLUMN "gender" TEXT;
ALTER TABLE "CadenzaCustomer" ADD COLUMN "guardianId" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "CadenzaCustomer_appId_guardianId_status_idx" ON "CadenzaCustomer"("appId", "guardianId", "status");
ALTER TABLE "CadenzaCustomer" ADD CONSTRAINT "CadenzaCustomer_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "CadenzaCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
