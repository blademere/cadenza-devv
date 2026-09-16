-- Make Role ownership explicit without relying on the legacy global role-name
-- constraint name. Prisma already controls the migration transaction, so this
-- migration intentionally contains no explicit BEGIN/COMMIT.

ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "appId" TEXT;
ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_name_key";

-- Prisma may commit between migration statements. Keep these staging tables
-- alive for the migration session instead of dropping them at transaction
-- boundaries.
CREATE TEMP TABLE IF NOT EXISTS "_RoleAppMap" (
    "legacyRoleId" INTEGER NOT NULL,
    "appId" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    PRIMARY KEY ("legacyRoleId", "appId")
);

CREATE TEMP TABLE IF NOT EXISTS "_RoleAppAssignments" (
    "roleId" INTEGER NOT NULL,
    "appId" TEXT NOT NULL,
    PRIMARY KEY ("roleId", "appId")
);

-- Existing membership assignments are the strongest ownership evidence.
INSERT INTO "_RoleAppAssignments" ("roleId", "appId")
SELECT DISTINCT amr."roleId", am."appId"
FROM "AppMembershipRole" amr
JOIN "AppMembership" am ON am.id = amr."membershipId"
JOIN "App" app ON app.id = am."appId"
ON CONFLICT ("roleId", "appId") DO NOTHING;

-- Roles created by seed/configuration may not yet have a membership. Infer
-- their owner from application-prefixed permissions.
INSERT INTO "_RoleAppAssignments" ("roleId", "appId")
SELECT DISTINCT rp."roleId", app.id
FROM "RolePermission" rp
JOIN "Permission" p ON p.id = rp."permissionId"
JOIN "Module" m ON m.id = p."moduleId"
JOIN "App" app
  ON LEFT(m.key, LENGTH(app.key) + 1) = app.key || '_'
ON CONFLICT ("roleId", "appId") DO NOTHING;

-- These are unreachable legacy roles: no membership and no application-
-- scoped permission identifies an owner. Do not invent ownership for them.
DELETE FROM "Role"
WHERE id IN (
    SELECT r.id
    FROM "Role" r
    LEFT JOIN "_RoleAppAssignments" ra ON ra."roleId" = r.id
    WHERE ra."roleId" IS NULL
);

-- Retain the existing row for the first application and clone it for every
-- additional application that used the legacy shared role.
WITH primary_apps AS (
    SELECT "roleId", MIN("appId") AS "appId"
    FROM "_RoleAppAssignments"
    GROUP BY "roleId"
)
UPDATE "Role" r
SET "appId" = p."appId"
FROM primary_apps p
WHERE r.id = p."roleId";

INSERT INTO "_RoleAppMap" ("legacyRoleId", "appId", "roleId")
SELECT r.id, r."appId", r.id
FROM "Role" r;

INSERT INTO "Role" ("name", "description", "appId")
SELECT r."name", r."description", ra."appId"
FROM "Role" r
JOIN "_RoleAppAssignments" ra ON ra."roleId" = r.id
WHERE ra."appId" <> r."appId";

-- The old role name was globally unique, so each legacy role name identifies
-- its corresponding clone unambiguously.
INSERT INTO "_RoleAppMap" ("legacyRoleId", "appId", "roleId")
SELECT legacy.id, cloned."appId", cloned.id
FROM "Role" legacy
JOIN "_RoleAppAssignments" ra ON ra."roleId" = legacy.id
JOIN "Role" cloned
  ON cloned."name" = legacy."name"
 AND cloned."appId" = ra."appId"
WHERE ra."appId" <> legacy."appId";

-- Clone the complete permission set before moving membership assignments.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT map."roleId", rp."permissionId"
FROM "_RoleAppMap" map
JOIN "RolePermission" rp ON rp."roleId" = map."legacyRoleId"
WHERE map."roleId" <> map."legacyRoleId"
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Move each membership to the role owned by its application. Keep the target
-- mapping in a subquery so PostgreSQL does not treat the UPDATE target alias
-- as an invalid reference inside the FROM JOIN tree.
UPDATE "AppMembershipRole" amr
SET "roleId" = mapping."roleId"
FROM (
    SELECT amr_source."membershipId", amr_source."roleId" AS "legacyRoleId", map."roleId", am."appId"
    FROM "AppMembershipRole" amr_source
    JOIN "AppMembership" am ON am.id = amr_source."membershipId"
    JOIN "_RoleAppMap" map
      ON map."legacyRoleId" = amr_source."roleId"
     AND map."appId" = am."appId"
) mapping
WHERE amr."membershipId" = mapping."membershipId"
  AND amr."roleId" = mapping."legacyRoleId"
  AND amr."roleId" <> mapping."roleId";

ALTER TABLE "Role"
    ALTER COLUMN "appId" SET NOT NULL;

ALTER TABLE "Role"
    ADD CONSTRAINT "Role_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Role_appId_name_key" ON "Role"("appId", "name");
CREATE INDEX "Role_appId_idx" ON "Role"("appId");