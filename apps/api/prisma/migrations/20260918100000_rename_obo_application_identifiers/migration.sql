-- Rename OBO application authorization/workflow identifiers after the application-module refactor.
-- Fail closed if the target identifier already exists, because merging live authorization
-- modules or workflows would risk silently changing role or workflow history semantics.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Module" WHERE "key" = 'obo_plan_permits')
     AND EXISTS (SELECT 1 FROM "Module" WHERE "key" = 'obo_applications') THEN
    RAISE EXCEPTION 'Cannot rename OBO authorization module: both legacy and target module keys exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Module" WHERE "key" = 'obo_plan_permits') THEN
    UPDATE "Module"
    SET "key" = 'obo_applications',
        "name" = 'Obo Applications'
    WHERE "key" = 'obo_plan_permits';
  END IF;
END $$;

UPDATE "Permission" AS p
SET "action" = p."action"
FROM "Module" AS m
WHERE p."moduleId" = m."id"
  AND m."key" = 'obo_applications';

UPDATE "WorkflowTransition"
SET "permissionKey" = REPLACE("permissionKey", 'obo_plan_permits:', 'obo_applications:')
WHERE "permissionKey" LIKE 'obo_plan_permits:%';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Workflow" WHERE "key" = 'obo_plan_permit')
     AND EXISTS (SELECT 1 FROM "Workflow" WHERE "key" = 'obo_application') THEN
    RAISE EXCEPTION 'Cannot rename OBO workflow: both legacy and target workflow keys exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Workflow" WHERE "key" = 'obo_plan_permit') THEN
    UPDATE "Workflow"
    SET "key" = 'obo_application',
        "name" = 'OBO Application',
        "description" = 'Lifecycle workflow for an OBO application.'
    WHERE "key" = 'obo_plan_permit';
  END IF;
END $$;
