CREATE TABLE "CadenzaStudent" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaStudent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaStudent_appId_personId_key" ON "CadenzaStudent" ("appId","personId");
CREATE INDEX "CadenzaStudent_appId_status_idx" ON "CadenzaStudent" ("appId","status");
ALTER TABLE "CadenzaStudent" ADD CONSTRAINT "CadenzaStudent_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaStudent" ADD CONSTRAINT "CadenzaStudent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CadenzaInstructor" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "specialty" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaInstructor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaInstructor_appId_personId_key" ON "CadenzaInstructor" ("appId","personId");
CREATE INDEX "CadenzaInstructor_appId_status_idx" ON "CadenzaInstructor" ("appId","status");
ALTER TABLE "CadenzaInstructor" ADD CONSTRAINT "CadenzaInstructor_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaInstructor" ADD CONSTRAINT "CadenzaInstructor_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CadenzaInstrument" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "instrumentType" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "rentalRate" DECIMAL(19,4) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaInstrument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaInstrument_appId_resourceId_key" ON "CadenzaInstrument" ("appId","resourceId");
CREATE UNIQUE INDEX "CadenzaInstrument_appId_serialNumber_key" ON "CadenzaInstrument" ("appId","serialNumber");
CREATE INDEX "CadenzaInstrument_appId_status_idx" ON "CadenzaInstrument" ("appId","status");
ALTER TABLE "CadenzaInstrument" ADD CONSTRAINT "CadenzaInstrument_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaRoom" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "roomType" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "rentalRate" DECIMAL(19,4) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaRoom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaRoom_appId_resourceId_key" ON "CadenzaRoom" ("appId","resourceId");
CREATE INDEX "CadenzaRoom_appId_roomType_status_idx" ON "CadenzaRoom" ("appId","roomType","status");
ALTER TABLE "CadenzaRoom" ADD CONSTRAINT "CadenzaRoom_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaLessonPackage" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(19,4) NOT NULL,
  "numberOfSessions" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaLessonPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaLessonPackage_appId_name_key" ON "CadenzaLessonPackage" ("appId","name");
CREATE INDEX "CadenzaLessonPackage_appId_status_idx" ON "CadenzaLessonPackage" ("appId","status");
ALTER TABLE "CadenzaLessonPackage" ADD CONSTRAINT "CadenzaLessonPackage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaLessonAttachment" (
  "id" TEXT NOT NULL,
  "lessonPackageId" TEXT NOT NULL,
  "storageReference" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CadenzaLessonAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CadenzaLessonAttachment_lessonPackageId_idx" ON "CadenzaLessonAttachment" ("lessonPackageId");
ALTER TABLE "CadenzaLessonAttachment" ADD CONSTRAINT "CadenzaLessonAttachment_lessonPackageId_fkey" FOREIGN KEY ("lessonPackageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaEnrollment" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "lessonPackageId" TEXT NOT NULL,
  "paymentObligationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  "enrolledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaEnrollment_appId_studentId_lessonPackageId_key" ON "CadenzaEnrollment" ("appId","studentId","lessonPackageId");
CREATE INDEX "CadenzaEnrollment_appId_studentId_status_idx" ON "CadenzaEnrollment" ("appId","studentId","status");
CREATE INDEX "CadenzaEnrollment_appId_lessonPackageId_idx" ON "CadenzaEnrollment" ("appId","lessonPackageId");
ALTER TABLE "CadenzaEnrollment" ADD CONSTRAINT "CadenzaEnrollment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaEnrollment" ADD CONSTRAINT "CadenzaEnrollment_lessonPackageId_fkey" FOREIGN KEY ("lessonPackageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CadenzaLessonSession" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "instructorId" TEXT,
  "roomId" TEXT,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaLessonSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CadenzaLessonSession_appId_scheduledStart_scheduledEnd_idx" ON "CadenzaLessonSession" ("appId","scheduledStart","scheduledEnd");
CREATE INDEX "CadenzaLessonSession_appId_instructorId_scheduledStart_idx" ON "CadenzaLessonSession" ("appId","instructorId","scheduledStart");
CREATE INDEX "CadenzaLessonSession_appId_roomId_scheduledStart_idx" ON "CadenzaLessonSession" ("appId","roomId","scheduledStart");
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CadenzaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaAttendance" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "markedByUserId" INTEGER,
  "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "CadenzaAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CadenzaAttendance_sessionId_key" ON "CadenzaAttendance" ("sessionId");
ALTER TABLE "CadenzaAttendance" ADD CONSTRAINT "CadenzaAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CadenzaLessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaRescheduleRequest" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "requestedByUserId" INTEGER NOT NULL,
  "requestedStart" TIMESTAMP(3) NOT NULL,
  "requestedEnd" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaRescheduleRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CadenzaRescheduleRequest_appId_status_createdAt_idx" ON "CadenzaRescheduleRequest" ("appId","status","createdAt");
CREATE INDEX "CadenzaRescheduleRequest_sessionId_idx" ON "CadenzaRescheduleRequest" ("sessionId");
ALTER TABLE "CadenzaRescheduleRequest" ADD CONSTRAINT "CadenzaRescheduleRequest_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CadenzaRental" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "customerUserId" INTEGER NOT NULL,
  "resourceId" TEXT NOT NULL,
  "rentalType" TEXT NOT NULL,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "totalAmount" DECIMAL(19,4) NOT NULL,
  "requiredDownPayment" DECIMAL(19,4) NOT NULL,
  "paymentObligationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "checkedOutAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadenzaRental_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CadenzaRental_appId_resourceId_scheduledStart_scheduledEnd_idx" ON "CadenzaRental" ("appId","resourceId","scheduledStart","scheduledEnd");
CREATE INDEX "CadenzaRental_appId_customerUserId_status_idx" ON "CadenzaRental" ("appId","customerUserId","status");
ALTER TABLE "CadenzaRental" ADD CONSTRAINT "CadenzaRental_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
