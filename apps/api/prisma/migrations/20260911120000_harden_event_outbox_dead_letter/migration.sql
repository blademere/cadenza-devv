ALTER TABLE "EventOutbox"
ADD COLUMN "deadAt" TIMESTAMP(3);

CREATE INDEX "EventOutbox_status_deadAt_idx"
ON "EventOutbox"("status", "deadAt");
