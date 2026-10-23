CREATE TABLE "CadenzaCashierPayment" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "processedByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CadenzaCashierPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaCashierPayment_appId_idempotencyKey_key" ON "CadenzaCashierPayment"("appId","idempotencyKey");
CREATE UNIQUE INDEX "CadenzaCashierPayment_appId_method_reference_key" ON "CadenzaCashierPayment"("appId","method","reference");
CREATE INDEX "CadenzaCashierPayment_appId_transactionType_sourceId_createdAt_idx" ON "CadenzaCashierPayment"("appId","transactionType","sourceId","createdAt");
ALTER TABLE "CadenzaCashierPayment" ADD CONSTRAINT "CadenzaCashierPayment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
