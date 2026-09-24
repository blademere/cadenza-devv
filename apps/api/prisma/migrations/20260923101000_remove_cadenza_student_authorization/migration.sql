-- Remove the obsolete Cadenza student authorization module after the
-- Student domain was replaced by CadenzaCustomer.
DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT p."id"
  FROM "Permission" p
  JOIN "Module" m ON m."id" = p."moduleId"
  WHERE m."key" = 'cadenza_students'
);

DELETE FROM "Permission"
WHERE "moduleId" IN (
  SELECT "id" FROM "Module" WHERE "key" = 'cadenza_students'
);

DELETE FROM "Module"
WHERE "key" = 'cadenza_students';
