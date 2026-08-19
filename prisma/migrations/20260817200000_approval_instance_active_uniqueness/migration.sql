-- Prevent concurrent workers from creating multiple active approval instances
-- for the same policy + subject. Historical completed/rejected instances remain allowed.
CREATE UNIQUE INDEX "ApprovalInstance_active_subject_unique"
ON "ApprovalInstance" ("policyId", "subjectType", "subjectId")
WHERE "status" = 'PENDING';
