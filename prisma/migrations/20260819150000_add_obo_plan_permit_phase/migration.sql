CREATE TABLE "OboPermitType" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "formId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OboPermitType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OboProfessional" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "userId" INTEGER,
  "registrationNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "verifiedByUserId" INTEGER,
  "verifiedAt" TIMESTAMP(3),
  "verificationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OboProfessional_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OboPermitApplication" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "permitTypeId" TEXT NOT NULL,
  "clientPersonId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "formVersionId" TEXT,
  "formValues" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "declineReason" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "acceptedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OboPermitApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OboSubmissionAppointment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OboSubmissionAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OboReceivingDecision" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "decidedByUserId" INTEGER NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OboReceivingDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OboProfessionalVerificationDecision" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "decidedByUserId" INTEGER NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OboProfessionalVerificationDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OboPermitType_key_key" ON "OboPermitType"("key");
CREATE INDEX "OboPermitType_isActive_idx" ON "OboPermitType"("isActive");
CREATE UNIQUE INDEX "OboProfessional_userId_key" ON "OboProfessional"("userId");
CREATE UNIQUE INDEX "OboProfessional_registrationNumber_key" ON "OboProfessional"("registrationNumber");
CREATE INDEX "OboProfessional_personId_idx" ON "OboProfessional"("personId");
CREATE INDEX "OboProfessional_status_idx" ON "OboProfessional"("status");
CREATE UNIQUE INDEX "OboPermitApplication_referenceNumber_key" ON "OboPermitApplication"("referenceNumber");
CREATE UNIQUE INDEX "OboPermitApplication_caseId_key" ON "OboPermitApplication"("caseId");
CREATE INDEX "OboPermitApplication_clientPersonId_createdAt_idx" ON "OboPermitApplication"("clientPersonId", "createdAt");
CREATE INDEX "OboPermitApplication_professionalId_createdAt_idx" ON "OboPermitApplication"("professionalId", "createdAt");
CREATE INDEX "OboPermitApplication_status_createdAt_idx" ON "OboPermitApplication"("status", "createdAt");
CREATE INDEX "OboPermitApplication_permitTypeId_status_idx" ON "OboPermitApplication"("permitTypeId", "status");
CREATE UNIQUE INDEX "OboSubmissionAppointment_applicationId_key" ON "OboSubmissionAppointment"("applicationId");
CREATE UNIQUE INDEX "OboSubmissionAppointment_appointmentId_key" ON "OboSubmissionAppointment"("appointmentId");
CREATE INDEX "OboReceivingDecision_applicationId_decidedAt_idx" ON "OboReceivingDecision"("applicationId", "decidedAt");
CREATE INDEX "OboProfessionalVerificationDecision_professionalId_decidedAt_idx" ON "OboProfessionalVerificationDecision"("professionalId", "decidedAt");

ALTER TABLE "OboProfessional" ADD CONSTRAINT "OboProfessional_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboProfessional" ADD CONSTRAINT "OboProfessional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OboProfessional" ADD CONSTRAINT "OboProfessional_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_permitTypeId_fkey" FOREIGN KEY ("permitTypeId") REFERENCES "OboPermitType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_clientPersonId_fkey" FOREIGN KEY ("clientPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "OboProfessional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboPermitApplication" ADD CONSTRAINT "OboPermitApplication_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OboSubmissionAppointment" ADD CONSTRAINT "OboSubmissionAppointment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OboPermitApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OboReceivingDecision" ADD CONSTRAINT "OboReceivingDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OboPermitApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OboReceivingDecision" ADD CONSTRAINT "OboReceivingDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OboProfessionalVerificationDecision" ADD CONSTRAINT "OboProfessionalVerificationDecision_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "OboProfessional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OboProfessionalVerificationDecision" ADD CONSTRAINT "OboProfessionalVerificationDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
