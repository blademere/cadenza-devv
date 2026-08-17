CREATE TABLE "BusinessRule" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "event" TEXT NOT NULL,
  "entityType" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessRule_key_key" ON "BusinessRule"("key");
CREATE INDEX "BusinessRule_event_active_priority_idx" ON "BusinessRule"("event", "active", "priority");
CREATE INDEX "BusinessRule_entityType_event_idx" ON "BusinessRule"("entityType", "event");

CREATE TABLE "ApprovalPolicy" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entityType" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApprovalPolicy_key_key" ON "ApprovalPolicy"("key");
CREATE INDEX "ApprovalPolicy_entityType_active_priority_idx" ON "ApprovalPolicy"("entityType", "active", "priority");

CREATE TABLE "ApprovalStep" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "approverType" TEXT NOT NULL,
  "approverValue" TEXT,
  "requiredCount" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApprovalStep_policyId_stepOrder_key" ON "ApprovalStep"("policyId", "stepOrder");
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApprovalInstance" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApprovalInstance_subjectType_subjectId_status_idx" ON "ApprovalInstance"("subjectType", "subjectId", "status");
CREATE INDEX "ApprovalInstance_policyId_status_idx" ON "ApprovalInstance"("policyId", "status");
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "assigneeUserId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "comment" TEXT,
  "actedByUserId" INTEGER,
  "actedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApprovalRequest_instanceId_status_idx" ON "ApprovalRequest"("instanceId", "status");
CREATE INDEX "ApprovalRequest_assigneeUserId_status_idx" ON "ApprovalRequest"("assigneeUserId", "status");
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

CREATE TABLE "NotificationRule" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "entityType" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "conditions" JSONB NOT NULL,
  "templateId" TEXT NOT NULL,
  "recipientType" TEXT NOT NULL,
  "recipientValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationRule_key_key" ON "NotificationRule"("key");
CREATE INDEX "NotificationRule_event_active_priority_idx" ON "NotificationRule"("event", "active", "priority");
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");
CREATE INDEX "NotificationDelivery_recipient_createdAt_idx" ON "NotificationDelivery"("recipient", "createdAt");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SlaPolicy" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "workflowStepKey" TEXT,
  "durationSeconds" INTEGER NOT NULL,
  "warningSeconds" INTEGER,
  "escalationSeconds" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SlaPolicy_key_key" ON "SlaPolicy"("key");
CREATE INDEX "SlaPolicy_entityType_active_idx" ON "SlaPolicy"("entityType", "active");

CREATE TABLE "SlaInstance" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "warningAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "escalatedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlaInstance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SlaInstance_subjectType_subjectId_status_idx" ON "SlaInstance"("subjectType", "subjectId", "status");
CREATE INDEX "SlaInstance_status_dueAt_idx" ON "SlaInstance"("status", "dueAt");
CREATE INDEX "SlaInstance_status_warningAt_idx" ON "SlaInstance"("status", "warningAt");
ALTER TABLE "SlaInstance" ADD CONSTRAINT "SlaInstance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SlaPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
