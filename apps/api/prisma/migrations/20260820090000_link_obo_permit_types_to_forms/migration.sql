-- Link OBO permit types to the platform form definition used to collect their application fields.
ALTER TABLE "OboPermitType"
  ADD CONSTRAINT "OboPermitType_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "Form"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "OboPermitType_formId_idx" ON "OboPermitType"("formId");
