-- Phase 9: make document artifacts application-aware while preserving
-- explicitly shared/global documents through a nullable appId.
ALTER TABLE "Document"
ADD COLUMN "appId" TEXT;

CREATE INDEX "Document_appId_createdAt_idx"
ON "Document"("appId", "createdAt");

ALTER TABLE "Document"
ADD CONSTRAINT "Document_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "App"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
