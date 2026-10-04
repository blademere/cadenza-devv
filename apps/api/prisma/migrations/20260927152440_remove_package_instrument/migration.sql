/*
  Warnings:

  - You are about to drop the column `instrument` on the `CadenzaLessonPackage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[appId,name]` on the table `CadenzaLessonPackage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CadenzaLessonPackage_appId_instrument_status_idx";

-- DropIndex
DROP INDEX "CadenzaLessonPackage_appId_name_instrument_key";

-- AlterTable
ALTER TABLE "CadenzaLessonPackage" DROP COLUMN "instrument";

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaLessonPackage_appId_name_key" ON "CadenzaLessonPackage"("appId", "name");
