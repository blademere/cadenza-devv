CREATE TABLE "WebhookDeliveryIdempotency" (
  "idempotencyKey" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDeliveryIdempotency_pkey" PRIMARY KEY ("idempotencyKey"),
  CONSTRAINT "WebhookDeliveryIdempotency_deliveryId_key" UNIQUE ("deliveryId"),
  CONSTRAINT "WebhookDeliveryIdempotency_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "WebhookDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WebhookDeliveryIdempotency_createdAt_idx" ON "WebhookDeliveryIdempotency"("createdAt");
