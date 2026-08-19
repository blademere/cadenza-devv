CREATE TABLE "Person" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Person_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CaseType" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseRecord" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "caseNumber" TEXT NOT NULL,
    "caseTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CaseRecord_caseTypeId_fkey"
      FOREIGN KEY ("caseTypeId") REFERENCES "CaseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseRecord_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CaseStatusHistory_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseStatusHistory_changedByUserId_fkey"
      FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CaseParticipant" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CaseParticipant_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseParticipant_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "RequirementDefinition" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseRequirement" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "caseId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseRequirement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CaseRequirement_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseRequirement_requirementId_fkey"
      FOREIGN KEY ("requirementId") REFERENCES "RequirementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "caseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assigneeUserId" INTEGER,
    "createdByUserId" INTEGER,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Task_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeUserId_fkey"
      FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");
CREATE INDEX "Person_email_idx" ON "Person"("email");
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");
CREATE UNIQUE INDEX "CaseType_key_key" ON "CaseType"("key");
CREATE INDEX "CaseType_isActive_idx" ON "CaseType"("isActive");
CREATE UNIQUE INDEX "CaseRecord_caseNumber_key" ON "CaseRecord"("caseNumber");
CREATE INDEX "CaseRecord_caseTypeId_status_idx" ON "CaseRecord"("caseTypeId", "status");
CREATE INDEX "CaseRecord_status_createdAt_idx" ON "CaseRecord"("status", "createdAt");
CREATE INDEX "CaseRecord_createdByUserId_idx" ON "CaseRecord"("createdByUserId");
CREATE INDEX "CaseStatusHistory_caseId_createdAt_idx" ON "CaseStatusHistory"("caseId", "createdAt");
CREATE INDEX "CaseStatusHistory_changedByUserId_idx" ON "CaseStatusHistory"("changedByUserId");
CREATE UNIQUE INDEX "CaseParticipant_caseId_personId_roleKey_key" ON "CaseParticipant"("caseId", "personId", "roleKey");
CREATE INDEX "CaseParticipant_caseId_roleKey_idx" ON "CaseParticipant"("caseId", "roleKey");
CREATE INDEX "CaseParticipant_personId_idx" ON "CaseParticipant"("personId");
CREATE UNIQUE INDEX "RequirementDefinition_key_key" ON "RequirementDefinition"("key");
CREATE INDEX "RequirementDefinition_isActive_idx" ON "RequirementDefinition"("isActive");
CREATE UNIQUE INDEX "CaseRequirement_caseId_requirementId_key" ON "CaseRequirement"("caseId", "requirementId");
CREATE INDEX "CaseRequirement_caseId_status_idx" ON "CaseRequirement"("caseId", "status");
CREATE INDEX "CaseRequirement_requirementId_idx" ON "CaseRequirement"("requirementId");
CREATE INDEX "Task_caseId_status_idx" ON "Task"("caseId", "status");
CREATE INDEX "Task_assigneeUserId_status_idx" ON "Task"("assigneeUserId", "status");
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");
