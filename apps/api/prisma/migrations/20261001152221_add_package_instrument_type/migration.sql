/*
  Warnings:

  - You are about to drop the column `rentalDuration` on the `CadenzaInstrument` table. All the data in the column will be lost.
  - You are about to drop the column `requiredDownPayment` on the `CadenzaRental` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `CadenzaRental` table. All the data in the column will be lost.
  - Added the required column `refundableDeposit` to the `CadenzaRental` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CadenzaRental_appId_resourceId_scheduledStart_scheduledEnd_idx";

-- AlterTable
ALTER TABLE "CadenzaInstrument" DROP COLUMN "rentalDuration";

-- AlterTable
ALTER TABLE "CadenzaRental" DROP COLUMN "requiredDownPayment",
DROP COLUMN "resourceId",
ADD COLUMN     "refundableDeposit" DECIMAL(19,4) NOT NULL,
ADD COLUMN     "rentalPackageId" TEXT;

-- CreateTable
CREATE TABLE "CadenzaRentalPackage" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rentalRate" DECIMAL(19,4) NOT NULL,
    "rentalHours" INTEGER NOT NULL DEFAULT 8,
    "depositAmount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRentalPackageItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rentalPackageId" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRentalItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadenzaRentalPackage_appId_status_idx" ON "CadenzaRentalPackage"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRentalPackage_appId_name_key" ON "CadenzaRentalPackage"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaRentalPackageItem_appId_rentalPackageId_idx" ON "CadenzaRentalPackageItem"("appId", "rentalPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRentalPackageItem_rentalPackageId_instrumentType_key" ON "CadenzaRentalPackageItem"("rentalPackageId", "instrumentType");

-- CreateIndex
CREATE INDEX "CadenzaRentalItem_appId_rentalId_idx" ON "CadenzaRentalItem"("appId", "rentalId");

-- CreateIndex
CREATE INDEX "CadenzaRentalItem_appId_instrumentId_idx" ON "CadenzaRentalItem"("appId", "instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRentalItem_rentalId_instrumentId_key" ON "CadenzaRentalItem"("rentalId", "instrumentId");

-- CreateIndex
CREATE INDEX "CadenzaInstrument_appId_instrumentType_status_idx" ON "CadenzaInstrument"("appId", "instrumentType", "status");

-- CreateIndex
CREATE INDEX "CadenzaRental_appId_scheduledStart_scheduledEnd_idx" ON "CadenzaRental"("appId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "CadenzaRental_appId_rentalPackageId_idx" ON "CadenzaRental"("appId", "rentalPackageId");

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackage" ADD CONSTRAINT "CadenzaRentalPackage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackageItem" ADD CONSTRAINT "CadenzaRentalPackageItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackageItem" ADD CONSTRAINT "CadenzaRentalPackageItem_rentalPackageId_fkey" FOREIGN KEY ("rentalPackageId") REFERENCES "CadenzaRentalPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRental" ADD CONSTRAINT "CadenzaRental_rentalPackageId_fkey" FOREIGN KEY ("rentalPackageId") REFERENCES "CadenzaRentalPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CadenzaRental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CadenzaInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
