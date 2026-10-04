/*
  Warnings:

  - You are about to drop the `CadenzaLessonAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CadenzaLessonAttachment" DROP CONSTRAINT "CadenzaLessonAttachment_lessonPackageId_fkey";

-- AlterTable
ALTER TABLE "CadenzaLessonPackage" ADD COLUMN     "courseId" TEXT;

-- DropTable
DROP TABLE "CadenzaLessonAttachment";

-- CreateTable
CREATE TABLE "CadenzaCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaCourseMaterial" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaCourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadenzaCourse_appId_status_idx" ON "CadenzaCourse"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCourse_appId_name_key" ON "CadenzaCourse"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaCourseMaterial_courseId_idx" ON "CadenzaCourseMaterial"("courseId");

-- CreateIndex
CREATE INDEX "CadenzaLessonPackage_appId_courseId_idx" ON "CadenzaLessonPackage"("appId", "courseId");

-- AddForeignKey
ALTER TABLE "CadenzaLessonPackage" ADD CONSTRAINT "CadenzaLessonPackage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCourse" ADD CONSTRAINT "CadenzaCourse_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCourseMaterial" ADD CONSTRAINT "CadenzaCourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
