ALTER TABLE "CadenzaEnrollment"
  ADD CONSTRAINT "CadenzaEnrollment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "CadenzaStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CadenzaLessonSession"
  ADD CONSTRAINT "CadenzaLessonSession_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CadenzaRescheduleRequest"
  ADD CONSTRAINT "CadenzaRescheduleRequest_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "CadenzaLessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
