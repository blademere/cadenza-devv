ALTER TABLE "EventOutbox"
ADD COLUMN "lockToken" TEXT,
ADD COLUMN "leaseUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "EventOutbox_lockToken_key" ON "EventOutbox"("lockToken");
CREATE INDEX "EventOutbox_status_leaseUntil_idx" ON "EventOutbox"("status", "leaseUntil");
