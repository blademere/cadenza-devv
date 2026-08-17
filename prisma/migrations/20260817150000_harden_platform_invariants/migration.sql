-- PostgreSQL partial unique indexes enforce the invariant that each definition
-- has at most one published version, even under concurrent publish requests.
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowVersion_one_published_per_workflow"
  ON "WorkflowVersion" ("workflowId")
  WHERE "status" = 'PUBLISHED';

CREATE UNIQUE INDEX IF NOT EXISTS "FormVersion_one_published_per_form"
  ON "FormVersion" ("formId")
  WHERE "status" = 'PUBLISHED';
