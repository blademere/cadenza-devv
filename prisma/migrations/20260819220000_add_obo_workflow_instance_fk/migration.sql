-- Enforce referential integrity for the OBO permit workflow instance.
-- The column remains nullable so any legacy rows without a workflow instance
-- can be identified and migrated separately. Any non-null orphan reference
-- causes migration validation to fail rather than silently creating bad data.
ALTER TABLE "OboPermitApplication"
ADD CONSTRAINT "OboPermitApplication_workflowInstanceId_fkey"
FOREIGN KEY ("workflowInstanceId")
REFERENCES "WorkflowInstance"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
