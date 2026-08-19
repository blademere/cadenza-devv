-- Add deterministic idempotency to notification delivery creation.
ALTER TABLE "NotificationDelivery"
ADD COLUMN "idempotencyKey" TEXT;

-- Existing rows predate the idempotency key. Generate a unique migration-time
-- value for each row; future application writes use deterministic event keys.
UPDATE "NotificationDelivery"
SET "idempotencyKey" = md5("id"::text)
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "NotificationDelivery"
ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key"
ON "NotificationDelivery"("idempotencyKey");
