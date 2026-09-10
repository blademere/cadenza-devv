CREATE TABLE "OboPermitApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "documentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "receivedAt" TIMESTAMP(3),
  "receivedByUserId" INTEGER,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByUserId" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OboPermitApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OboPermitApplicationDocument_applicationId_requirementId_key"
  ON "OboPermitApplicationDocument"("applicationId", "requirementId");

CREATE INDEX "OboPermitApplicationDocument_applicationId_status_idx"
  ON "OboPermitApplicationDocument"("applicationId", "status");

CREATE INDEX "OboPermitApplicationDocument_requirementId_idx"
  ON "OboPermitApplicationDocument"("requirementId");

CREATE INDEX "OboPermitApplicationDocument_documentId_idx"
  ON "OboPermitApplicationDocument"("documentId");

ALTER TABLE "OboPermitApplicationDocument"
  ADD CONSTRAINT "OboPermitApplicationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "OboPermitApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OboPermitApplicationDocument"
  ADD CONSTRAINT "OboPermitApplicationDocument_receivedByUserId_fkey"
  FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OboPermitApplicationDocument"
  ADD CONSTRAINT "OboPermitApplicationDocument_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
