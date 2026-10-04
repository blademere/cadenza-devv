ALTER TABLE "CadenzaEnrollment"
  ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE INDEX "CadenzaEnrollment_appId_status_paymentExpiresAt_idx"
  ON "CadenzaEnrollment"("appId","status","paymentExpiresAt");

ALTER TABLE "CadenzaLessonSession"
  ADD CONSTRAINT "CadenzaLessonSession_status_check"
  CHECK ("status" IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'));
