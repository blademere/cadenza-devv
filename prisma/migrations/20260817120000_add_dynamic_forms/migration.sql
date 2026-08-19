CREATE TABLE "Form" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entityType" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormVersion" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSection" (
  "id" TEXT NOT NULL,
  "formVersionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visibility" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormField" (
  "id" TEXT NOT NULL,
  "formVersionId" TEXT NOT NULL,
  "sectionId" TEXT,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "defaultValue" JSONB,
  "validation" JSONB,
  "visibility" JSONB,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormOption" (
  "id" TEXT NOT NULL,
  "fieldId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  CONSTRAINT "FormOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL,
  "formVersionId" TEXT NOT NULL,
  "subjectType" TEXT,
  "subjectId" TEXT,
  "submittedByUserId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "values" JSONB NOT NULL,
  "validationErrors" JSONB,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentType" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRequirement" (
  "id" TEXT NOT NULL,
  "documentTypeId" TEXT NOT NULL,
  "formVersionId" TEXT,
  "workflowVersionId" TEXT,
  "fieldKey" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "allowedFileTypes" TEXT[] NOT NULL,
  "maxSizeBytes" BIGINT,
  "condition" JSONB,
  "source" TEXT NOT NULL DEFAULT 'CLIENT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Form_key_key" ON "Form"("key");
CREATE UNIQUE INDEX "FormVersion_formId_version_key" ON "FormVersion"("formId", "version");
CREATE INDEX "FormVersion_formId_status_idx" ON "FormVersion"("formId", "status");
CREATE UNIQUE INDEX "FormSection_formVersionId_key_key" ON "FormSection"("formVersionId", "key");
CREATE INDEX "FormSection_formVersionId_sortOrder_idx" ON "FormSection"("formVersionId", "sortOrder");
CREATE UNIQUE INDEX "FormField_formVersionId_key_key" ON "FormField"("formVersionId", "key");
CREATE INDEX "FormField_formVersionId_sortOrder_idx" ON "FormField"("formVersionId", "sortOrder");
CREATE INDEX "FormField_sectionId_sortOrder_idx" ON "FormField"("sectionId", "sortOrder");
CREATE UNIQUE INDEX "FormOption_fieldId_value_key" ON "FormOption"("fieldId", "value");
CREATE INDEX "FormOption_fieldId_sortOrder_idx" ON "FormOption"("fieldId", "sortOrder");
CREATE INDEX "FormSubmission_formVersionId_status_idx" ON "FormSubmission"("formVersionId", "status");
CREATE INDEX "FormSubmission_subjectType_subjectId_idx" ON "FormSubmission"("subjectType", "subjectId");
CREATE INDEX "FormSubmission_submittedByUserId_createdAt_idx" ON "FormSubmission"("submittedByUserId", "createdAt");
CREATE UNIQUE INDEX "DocumentType_key_key" ON "DocumentType"("key");
CREATE INDEX "DocumentRequirement_documentTypeId_idx" ON "DocumentRequirement"("documentTypeId");
CREATE INDEX "DocumentRequirement_formVersionId_sortOrder_idx" ON "DocumentRequirement"("formVersionId", "sortOrder");
CREATE INDEX "DocumentRequirement_workflowVersionId_sortOrder_idx" ON "DocumentRequirement"("workflowVersionId", "sortOrder");

ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormOption" ADD CONSTRAINT "FormOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
