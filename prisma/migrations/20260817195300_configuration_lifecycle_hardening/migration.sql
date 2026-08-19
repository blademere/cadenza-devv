-- Normalize legacy published duplicates before enforcing the invariant.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "workflowId" ORDER BY version DESC, "updatedAt" DESC, id DESC) AS rn
  FROM "WorkflowVersion"
  WHERE status = 'PUBLISHED'
)
UPDATE "WorkflowVersion" w
SET status = 'ARCHIVED', "updatedAt" = NOW()
FROM ranked r
WHERE w.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "formId" ORDER BY version DESC, "updatedAt" DESC, id DESC) AS rn
  FROM "FormVersion"
  WHERE status = 'PUBLISHED'
)
UPDATE "FormVersion" f
SET status = 'ARCHIVED', "updatedAt" = NOW()
FROM ranked r
WHERE f.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowVersion_one_published_per_workflow"
ON "WorkflowVersion" ("workflowId")
WHERE status = 'PUBLISHED';

CREATE UNIQUE INDEX IF NOT EXISTS "FormVersion_one_published_per_form"
ON "FormVersion" ("formId")
WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS "WorkflowVersion_lifecycle_lookup"
ON "WorkflowVersion" ("workflowId", status, version DESC);

CREATE INDEX IF NOT EXISTS "FormVersion_lifecycle_lookup"
ON "FormVersion" ("formId", status, version DESC);
