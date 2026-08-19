CREATE TABLE "AppointmentType" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvailabilitySchedule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointmentTypeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "slotDurationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilitySchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AvailabilitySchedule_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AvailabilitySchedule_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    CONSTRAINT "AvailabilitySchedule_capacity_check" CHECK ("capacity" > 0),
    CONSTRAINT "AvailabilitySchedule_slotDuration_check" CHECK ("slotDurationMinutes" > 0)
);

CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointmentTypeId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppointmentSlot_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentSlot_scheduleId_fkey"
      FOREIGN KEY ("scheduleId") REFERENCES "AvailabilitySchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AppointmentSlot_capacity_check" CHECK ("capacity" > 0),
    CONSTRAINT "AppointmentSlot_bookedCount_check" CHECK ("bookedCount" >= 0 AND "bookedCount" <= "capacity"),
    CONSTRAINT "AppointmentSlot_time_check" CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "referenceNumber" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Appointment_referenceNumber_key" UNIQUE ("referenceNumber"),
    CONSTRAINT "Appointment_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_slotId_fkey"
      FOREIGN KEY ("slotId") REFERENCES "AppointmentSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppointmentType_key_key" ON "AppointmentType"("key");
CREATE INDEX "AppointmentType_isActive_idx" ON "AppointmentType"("isActive");
CREATE INDEX "AvailabilitySchedule_type_day_active_idx" ON "AvailabilitySchedule"("appointmentTypeId", "dayOfWeek", "isActive");
CREATE UNIQUE INDEX "AppointmentSlot_type_startsAt_key" ON "AppointmentSlot"("appointmentTypeId", "startsAt");
CREATE INDEX "AppointmentSlot_startsAt_status_idx" ON "AppointmentSlot"("startsAt", "status");
CREATE INDEX "AppointmentSlot_type_startsAt_idx" ON "AppointmentSlot"("appointmentTypeId", "startsAt");
CREATE INDEX "Appointment_slot_status_idx" ON "Appointment"("slotId", "status");
CREATE INDEX "Appointment_user_createdAt_idx" ON "Appointment"("userId", "createdAt");
CREATE INDEX "Appointment_status_createdAt_idx" ON "Appointment"("status", "createdAt");
CREATE INDEX "Appointment_type_status_idx" ON "Appointment"("appointmentTypeId", "status");
