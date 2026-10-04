/*
  Warnings:

  - You are about to drop the column `courseId` on the `CadenzaLessonPackage` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `CadenzaLessonPackage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[packageId,name]` on the table `CadenzaCourse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `packageId` to the `CadenzaCourse` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CadenzaLessonPackage" DROP CONSTRAINT "CadenzaLessonPackage_courseId_fkey";

-- DropIndex
DROP INDEX "CadenzaCourse_appId_name_key";

-- DropIndex
DROP INDEX "CadenzaLessonPackage_appId_courseId_idx";

-- AlterTable
ALTER TABLE "CadenzaCourse" ADD COLUMN     "packageId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CadenzaLessonPackage" DROP COLUMN "courseId",
DROP COLUMN "description",
ADD COLUMN     "instrumentType" TEXT;

-- CreateIndex
CREATE INDEX "CadenzaCourse_packageId_idx" ON "CadenzaCourse"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCourse_packageId_name_key" ON "CadenzaCourse"("packageId", "name");

-- AddForeignKey
ALTER TABLE "CadenzaCourse" ADD CONSTRAINT "CadenzaCourse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
