-- `professionals` is a legacy authorization catalog entry.
-- The implemented professional domain is OBO Professional and is authorized
-- through `obo_professionals:*`. Remove the legacy module and all of its
-- permissions/role assignments so existing databases converge with the
-- canonical catalog used by db-seed.cjs.

DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT p."id"
  FROM "Permission" p
  INNER JOIN "Module" m ON m."id" = p."moduleId"
  WHERE m."key" = 'professionals'
);

DELETE FROM "Permission"
WHERE "moduleId" IN (
  SELECT "id"
  FROM "Module"
  WHERE "key" = 'professionals'
);

DELETE FROM "Module"
WHERE "key" = 'professionals';
