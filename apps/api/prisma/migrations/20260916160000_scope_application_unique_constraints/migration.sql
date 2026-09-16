-- Phase 13: application-scoped uniqueness.
-- Application-owned identifiers may repeat across applications, but remain unique
-- within their owning application.

DROP INDEX IF EXISTS "CaseRecord_caseNumber_key";
DROP INDEX IF EXISTS "Form_key_key";
DROP INDEX IF EXISTS "RequirementDefinition_key_key";
DROP INDEX IF EXISTS "AppointmentType_key_key";
DROP INDEX IF EXISTS "Appointment_referenceNumber_key";
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

CREATE UNIQUE INDEX "Form_appId_key_key"
  ON "Form" ("appId", "key");

CREATE UNIQUE INDEX "RequirementDefinition_appId_key_key"
  ON "RequirementDefinition" ("appId", "key");

CREATE UNIQUE INDEX "AppointmentType_appId_key_key"
  ON "AppointmentType" ("appId", "key");

CREATE UNIQUE INDEX "Appointment_appId_referenceNumber_key"
  ON "Appointment" ("appId", "referenceNumber");

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
