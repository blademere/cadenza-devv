ALTER TABLE "WorkflowHistory"
ADD COLUMN "correlationId" TEXT;

CREATE INDEX "WorkflowHistory_correlationId_idx"
ON "WorkflowHistory"("correlationId");

CREATE UNIQUE INDEX "WorkflowVersion_one_published_per_workflow_idx"
ON "WorkflowVersion"("workflowId")
WHERE "status" = 'PUBLISHED';
