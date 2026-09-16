-- Phase 13: application-scoped uniqueness.
-- Application-owned identifiers may repeat across applications, but remain unique
-- within their owning application.
--
-- This migration runs before the later appointment, requirement, and form
-- ownership migrations, so it only creates constraints for models that already
-- have appId at this point. The remaining Phase 13 constraints are added by
-- their ownership migrations after appId exists.

DROP INDEX IF EXISTS "CaseRecord_caseNumber_key";
DROP INDEX IF EXISTS "OboPermitType_key_key";
DROP INDEX IF EXISTS "OboPermitApplication_referenceNumber_key";
DROP INDEX IF EXISTS "OboProfessional_personId_key";
DROP INDEX IF EXISTS "OboProfessional_registrationNumber_key";
DROP INDEX IF EXISTS "OboProfessional_prcId_key";

CREATE UNIQUE INDEX "CaseRecord_appId_caseNumber_key"
  ON "CaseRecord" ("appId", "caseNumber");

-- CaseRecord.id is globally unique, but later application-owned relations need
-- a composite ownership key so the database can enforce id + appId together.
CREATE UNIQUE INDEX "CaseRecord_id_appId_key"
  ON "CaseRecord" ("id", "appId");

CREATE UNIQUE INDEX "OboPermitType_appId_key_key"
  ON "OboPermitType" ("appId", "key");

CREATE UNIQUE INDEX "OboPermitApplication_appId_referenceNumber_key"
  ON "OboPermitApplication" ("appId", "referenceNumber");

CREATE UNIQUE INDEX "OboProfessional_appId_personId_key"
  ON "OboProfessional" ("appId", "personId");

CREATE UNIQUE INDEX "OboProfessional_appId_registrationNumber_key"
  ON "OboProfessional" ("appId", "registrationNumber");

CREATE UNIQUE INDEX "OboProfessional_appId_prcId_key"
  ON "OboProfessional" ("appId", "prcId");
