-- CreateTable
CREATE TABLE "EventOutbox" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actorId" INTEGER,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    "processedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_idempotencyKey_key" ON "EventOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EventOutbox_status_availableAt_createdAt_idx" ON "EventOutbox"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "EventOutbox_status_leaseUntil_idx" ON "EventOutbox"("status", "leaseUntil");

-- CreateIndex
CREATE INDEX "EventOutbox_entityType_entityId_idx" ON "EventOutbox"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EventOutbox_correlationId_idx" ON "EventOutbox"("correlationId");
