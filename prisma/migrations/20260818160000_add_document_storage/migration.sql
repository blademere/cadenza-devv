CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "ownerId" INTEGER,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");
CREATE INDEX "Document_documentTypeId_idx" ON "Document"("documentTypeId");
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");
CREATE INDEX "Document_checksumSha256_idx" ON "Document"("checksumSha256");

ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey"
  FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
