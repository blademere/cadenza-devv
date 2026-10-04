/*
  Warnings:

  - A unique constraint covering the columns `[id,appId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,appId]` on the table `AppointmentType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,appId]` on the table `OboPermitApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[caseId,appId]` on the table `OboPermitApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,appId]` on the table `OboProfessional` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "OboPermitApplication" DROP CONSTRAINT "OboPermitApplication_workflowInstanceId_fkey";

-- DropIndex
DROP INDEX "Appointment_appointmentTypeId_status_idx";

-- DropIndex
DROP INDEX "Appointment_slotId_status_idx";

-- DropIndex
DROP INDEX "Appointment_status_createdAt_idx";

-- DropIndex
DROP INDEX "Appointment_userId_createdAt_idx";

-- DropIndex
DROP INDEX "AppointmentType_isActive_idx";

-- DropIndex
DROP INDEX "CaseRecord_caseTypeId_status_idx";

-- DropIndex
DROP INDEX "CaseRecord_status_createdAt_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_expiresAt_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_usedAt_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_userId_idx";

-- DropIndex
DROP INDEX "OboPermitApplication_clientPersonId_createdAt_idx";

-- DropIndex
DROP INDEX "OboPermitType_isActive_idx";

-- DropIndex
DROP INDEX "OboProfessional_professionalRole_idx";

-- DropIndex
DROP INDEX "OboProfessional_ptrNumber_idx";

-- DropIndex
DROP INDEX "OboProfessional_status_idx";

-- DropIndex
DROP INDEX "RefreshToken_replacedByTokenId_idx";

-- DropIndex
DROP INDEX "RequirementDefinition_isActive_idx";

-- DropIndex
DROP INDEX "Task_assigneeUserId_status_idx";

-- DropIndex
DROP INDEX "Task_caseId_status_idx";

-- DropIndex
DROP INDEX "Task_status_dueAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_appId_key" ON "Appointment"("id", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentType_id_appId_key" ON "AppointmentType"("id", "appId");

-- CreateIndex
CREATE INDEX "OboPermitApplication_appId_referenceNumber_idx" ON "OboPermitApplication"("appId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OboPermitApplication_id_appId_key" ON "OboPermitApplication"("id", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "OboPermitApplication_caseId_appId_key" ON "OboPermitApplication"("caseId", "appId");

-- CreateIndex
CREATE INDEX "OboPermitType_appId_key_idx" ON "OboPermitType"("appId", "key");

-- CreateIndex
CREATE INDEX "OboProfessional_appId_ptrNumber_idx" ON "OboProfessional"("appId", "ptrNumber");

-- CreateIndex
CREATE INDEX "OboProfessional_appId_professionalRole_idx" ON "OboProfessional"("appId", "professionalRole");

-- CreateIndex
CREATE UNIQUE INDEX "OboProfessional_id_appId_key" ON "OboProfessional"("id", "appId");

-- CreateIndex
CREATE INDEX "OboReceivingDecision_decision_decidedAt_idx" ON "OboReceivingDecision"("decision", "decidedAt");

-- AddForeignKey
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_appId_fkey" FOREIGN KEY ("caseId", "appId") REFERENCES "CaseRecord"("id", "appId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CadenzaEnrollment_appId_customerId_status" RENAME TO "CadenzaEnrollment_appId_customerId_status_idx";

-- RenameIndex
ALTER INDEX "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek_star" RENAME TO "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek__key";

-- RenameIndex
ALTER INDEX "OboPermitApplicationDocument_applicationId_caseRequirementId_ke" RENAME TO "OboPermitApplicationDocument_applicationId_caseRequirementI_key";
