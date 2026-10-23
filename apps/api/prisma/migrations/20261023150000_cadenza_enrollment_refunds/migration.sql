CREATE TABLE "CadenzaEnrollmentRefund" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "processedByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CadenzaEnrollmentRefund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaEnrollmentRefund_appId_enrollmentId_key" ON "CadenzaEnrollmentRefund"("appId","enrollmentId");
CREATE INDEX "CadenzaEnrollmentRefund_appId_createdAt_idx" ON "CadenzaEnrollmentRefund"("appId","createdAt");
ALTER TABLE "CadenzaEnrollmentRefund" ADD CONSTRAINT "CadenzaEnrollmentRefund_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
