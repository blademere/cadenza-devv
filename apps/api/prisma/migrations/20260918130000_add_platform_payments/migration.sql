CREATE TABLE "PaymentObligation" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "totalAmount" DECIMAL(19,4) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNPAID',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentObligation_appId_referenceType_referenceId_key"
  ON "PaymentObligation"("appId", "referenceType", "referenceId");
CREATE INDEX "PaymentObligation_appId_status_createdAt_idx"
  ON "PaymentObligation"("appId", "status", "createdAt");
CREATE INDEX "PaymentObligation_appId_referenceType_referenceId_idx"
  ON "PaymentObligation"("appId", "referenceType", "referenceId");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "obligationId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "method" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "providerReference" TEXT,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_obligationId_status_createdAt_idx"
  ON "Payment"("obligationId", "status", "createdAt");
CREATE INDEX "Payment_provider_providerReference_idx"
  ON "Payment"("provider", "providerReference");

CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentRefund_paymentId_status_createdAt_idx"
  ON "PaymentRefund"("paymentId", "status", "createdAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_obligationId_fkey"
  FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRefund"
  ADD CONSTRAINT "PaymentRefund_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
