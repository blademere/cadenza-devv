CREATE TABLE "OboPermitTypeRequirement" (
  "id" TEXT NOT NULL,
  "permitTypeId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OboPermitTypeRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OboPermitTypeRequirement_permitTypeId_requirementId_key"
  ON "OboPermitTypeRequirement"("permitTypeId", "requirementId");

CREATE INDEX "OboPermitTypeRequirement_permitTypeId_idx"
  ON "OboPermitTypeRequirement"("permitTypeId");

CREATE INDEX "OboPermitTypeRequirement_requirementId_idx"
  ON "OboPermitTypeRequirement"("requirementId");

ALTER TABLE "OboPermitTypeRequirement"
  ADD CONSTRAINT "OboPermitTypeRequirement_permitTypeId_fkey"
  FOREIGN KEY ("permitTypeId") REFERENCES "OboPermitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OboPermitTypeRequirement"
  ADD CONSTRAINT "OboPermitTypeRequirement_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "RequirementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
