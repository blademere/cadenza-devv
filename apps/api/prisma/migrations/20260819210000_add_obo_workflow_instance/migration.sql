-- Add the platform workflow instance reference to OBO permit applications.
-- Existing applications remain nullable until they are migrated/started through the workflow service.
ALTER TABLE "OboPermitApplication"
ADD COLUMN "workflowInstanceId" TEXT;

CREATE UNIQUE INDEX "OboPermitApplication_workflowInstanceId_key"
ON "OboPermitApplication"("workflowInstanceId");
