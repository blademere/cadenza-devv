-- OBO roles must only reference permissions owned by OBO authorization modules.
-- Older seeds assigned shared/global permissions (applications, appointments,
-- users, authorization) to OBO roles, which made the OBO role editor reject
-- the existing permission set on update.
DELETE FROM "RolePermission" AS rp
USING "Role" AS r, "Permission" AS p, "Module" AS m
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND p."moduleId" = m."id"
  AND r."appId" = (SELECT id FROM "App" WHERE key = 'obo')
  AND LEFT(m."key", 4) <> 'obo_';
