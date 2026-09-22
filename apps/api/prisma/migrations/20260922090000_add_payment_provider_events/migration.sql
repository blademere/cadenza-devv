-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB,
    "errorMessage" TEXT,
    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_eventId_eventType_key" ON "PaymentProviderEvent"("provider", "eventId", "eventType");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_provider_receivedAt_idx" ON "PaymentProviderEvent"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_status_receivedAt_idx" ON "PaymentProviderEvent"("status", "receivedAt");
