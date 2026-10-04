-- Introduce a person-backed Cadenza customer actor and migrate existing rentals.
CREATE TABLE "CadenzaCustomer" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaCustomer_appId_personId_key" ON "CadenzaCustomer"("appId", "personId");
CREATE INDEX "CadenzaCustomer_appId_status_idx" ON "CadenzaCustomer"("appId", "status");

ALTER TABLE "CadenzaCustomer"
  ADD CONSTRAINT "CadenzaCustomer_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaCustomer"
  ADD CONSTRAINT "CadenzaCustomer_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing app users with profiles become Cadenza customers.
INSERT INTO "CadenzaCustomer" ("id", "appId", "personId", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  m."appId",
  p."id",
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AppMembership" m
JOIN "Person" p ON p."userId" = m."userId"
JOIN "App" a ON a."id" = m."appId" AND a."key" = 'cadenza' AND a."isActive" = true
WHERE m."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "CadenzaCustomer" c
    WHERE c."appId" = m."appId" AND c."personId" = p."id"
  );

ALTER TABLE "CadenzaRental" ADD COLUMN "customerId" TEXT;

UPDATE "CadenzaRental" r
SET "customerId" = c."id"
FROM "CadenzaCustomer" c
JOIN "Person" p ON p."id" = c."personId"
WHERE c."appId" = r."appId"
  AND p."userId" = r."customerUserId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CadenzaRental" WHERE "customerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate Cadenza rentals: one or more customer users have no Person/CadenzaCustomer.';
  END IF;
END $$;

ALTER TABLE "CadenzaRental" ALTER COLUMN "customerId" SET NOT NULL;

ALTER TABLE "CadenzaRental"
  ADD CONSTRAINT "CadenzaRental_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CadenzaRental_appId_customerId_status_idx"
  ON "CadenzaRental"("appId", "customerId", "status");

DROP INDEX IF EXISTS "CadenzaRental_appId_customerUserId_status_idx";
ALTER TABLE "CadenzaRental" DROP COLUMN "customerUserId";
