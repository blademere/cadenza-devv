-- Add an idempotency key so event-driven in-app notifications are not duplicated.
ALTER TABLE "Notification"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Notification_idempotencyKey_key"
ON "Notification"("idempotencyKey");
