-- Add a person-backed Cadenza staff actor for non-customer business users.
-- Authorization remains attached to User -> AppMembership -> Role; this table
-- stores Cadenza-specific staff profile/state only.

CREATE TABLE "CadenzaStaff" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "staffType" TEXT NOT NULL DEFAULT 'STAFF',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaStaff_appId_personId_key"
  ON "CadenzaStaff"("appId", "personId");

CREATE INDEX "CadenzaStaff_appId_status_idx"
  ON "CadenzaStaff"("appId", "status");

CREATE INDEX "CadenzaStaff_appId_staffType_status_idx"
  ON "CadenzaStaff"("appId", "staffType", "status");

ALTER TABLE "CadenzaStaff"
  ADD CONSTRAINT "CadenzaStaff_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaStaff"
  ADD CONSTRAINT "CadenzaStaff_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
