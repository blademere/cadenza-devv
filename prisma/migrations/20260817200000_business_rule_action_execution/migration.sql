CREATE TABLE "BusinessRuleActionExecution" (
  "id" TEXT NOT NULL,
  "executionKey" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "actionIndex" INTEGER NOT NULL,
  "event" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "correlationId" TEXT NOT NULL,
  "causationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRuleActionExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessRuleActionExecution_executionKey_key" UNIQUE ("executionKey"),
  CONSTRAINT "BusinessRuleActionExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "BusinessRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BusinessRuleActionExecution_ruleId_event_idx" ON "BusinessRuleActionExecution"("ruleId", "event");
CREATE INDEX "BusinessRuleActionExecution_status_nextAttemptAt_idx" ON "BusinessRuleActionExecution"("status", "nextAttemptAt");
CREATE INDEX "BusinessRuleActionExecution_correlationId_idx" ON "BusinessRuleActionExecution"("correlationId");
