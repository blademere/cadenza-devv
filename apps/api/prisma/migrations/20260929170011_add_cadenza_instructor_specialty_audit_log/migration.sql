/*
  Warnings:

  - You are about to drop the `OboPermitApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboPermitApplicationDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboPermitType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboPermitTypeRequirement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboProfessional` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboProfessionalVerificationDecision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboReceivingDecision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OboSubmissionAppointment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_acceptedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_appId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_caseId_appId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_clientPersonId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_permitTypeId_appId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_replacesApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_workflowInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplicationDocument" DROP CONSTRAINT "OboPermitApplicationDocument_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplicationDocument" DROP CONSTRAINT "OboPermitApplicationDocument_caseRequirementId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitApplicationDocument" DROP CONSTRAINT "OboPermitApplicationDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitType" DROP CONSTRAINT "OboPermitType_appId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitTypeRequirement" DROP CONSTRAINT "OboPermitTypeRequirement_permitTypeId_fkey";

-- DropForeignKey
ALTER TABLE "OboPermitTypeRequirement" DROP CONSTRAINT "OboPermitTypeRequirement_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "OboProfessional" DROP CONSTRAINT "OboProfessional_appId_fkey";

-- DropForeignKey
ALTER TABLE "OboProfessional" DROP CONSTRAINT "OboProfessional_personId_fkey";

-- DropForeignKey
ALTER TABLE "OboProfessional" DROP CONSTRAINT "OboProfessional_verifiedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OboProfessionalVerificationDecision" DROP CONSTRAINT "OboProfessionalVerificationDecision_decidedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OboProfessionalVerificationDecision" DROP CONSTRAINT "OboProfessionalVerificationDecision_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "OboReceivingDecision" DROP CONSTRAINT "OboReceivingDecision_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "OboReceivingDecision" DROP CONSTRAINT "OboReceivingDecision_decidedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OboSubmissionAppointment" DROP CONSTRAINT "OboSubmissionAppointment_applicationId_fkey";

-- DropTable
DROP TABLE "OboPermitApplication";

-- DropTable
DROP TABLE "OboPermitApplicationDocument";

-- DropTable
DROP TABLE "OboPermitType";

-- DropTable
DROP TABLE "OboPermitTypeRequirement";

-- DropTable
DROP TABLE "OboProfessional";

-- DropTable
DROP TABLE "OboProfessionalVerificationDecision";

-- DropTable
DROP TABLE "OboReceivingDecision";

-- DropTable
DROP TABLE "OboSubmissionAppointment";

-- CreateTable
CREATE TABLE "CadenzaInstructorSpecialty" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructorSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaAuditLog" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "personId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenzaAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadenzaInstructorSpecialty_appId_instrumentType_idx" ON "CadenzaInstructorSpecialty"("appId", "instrumentType");

-- CreateIndex
CREATE INDEX "CadenzaInstructorSpecialty_instructorId_idx" ON "CadenzaInstructorSpecialty"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstructorSpecialty_appId_instructorId_instrumentTyp_key" ON "CadenzaInstructorSpecialty"("appId", "instructorId", "instrumentType");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_createdAt_idx" ON "CadenzaAuditLog"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_entityType_entityId_idx" ON "CadenzaAuditLog"("appId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_personId_idx" ON "CadenzaAuditLog"("appId", "personId");

-- AddForeignKey
ALTER TABLE "CadenzaInstructorSpecialty" ADD CONSTRAINT "CadenzaInstructorSpecialty_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorSpecialty" ADD CONSTRAINT "CadenzaInstructorSpecialty_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAuditLog" ADD CONSTRAINT "CadenzaAuditLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAuditLog" ADD CONSTRAINT "CadenzaAuditLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
