# Application Domain Migration Recovery

The task application-scope migration must establish Task.appId without requiring a composite CaseRecord key that is introduced by a later migration.

The historical migration therefore adds the Task -> App ownership foreign key only. The composite Task -> CaseRecord ownership foreign key is applied after the CaseRecord `(id, appId)` key exists during final ownership constraints.

When a database has a failed `20260916150000_scope_tasks_to_application` migration, resolve the failure only after the corrected migration is present. Do not mark the migration as applied while its schema changes are missing.
