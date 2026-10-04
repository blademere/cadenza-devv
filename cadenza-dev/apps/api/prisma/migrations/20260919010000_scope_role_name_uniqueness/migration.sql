-- Align the database role uniqueness constraint with application-scoped authorization.
-- Role names may be reused by different applications (for example, OBO/admin
-- and Cadenza/admin). The Role model is uniquely identified by appId + name.

DROP INDEX IF EXISTS "Role_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Role_appId_name_key"
  ON "Role"("appId", "name");
