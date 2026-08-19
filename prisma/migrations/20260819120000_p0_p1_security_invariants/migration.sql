ALTER TABLE "User"
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AppointmentType"
  ADD CONSTRAINT "AppointmentType_defaultDurationMinutes_positive"
  CHECK ("defaultDurationMinutes" > 0),
  ADD CONSTRAINT "AppointmentType_defaultCapacity_positive"
  CHECK ("defaultCapacity" > 0);

ALTER TABLE "AvailabilitySchedule"
  ADD CONSTRAINT "AvailabilitySchedule_dayOfWeek_valid"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "AvailabilitySchedule_slotDurationMinutes_positive"
  CHECK ("slotDurationMinutes" > 0),
  ADD CONSTRAINT "AvailabilitySchedule_capacity_positive"
  CHECK ("capacity" > 0),
  ADD CONSTRAINT "AvailabilitySchedule_time_order"
  CHECK ("startTime" < "endTime");

ALTER TABLE "AppointmentSlot"
  ADD CONSTRAINT "AppointmentSlot_capacity_positive"
  CHECK ("capacity" > 0),
  ADD CONSTRAINT "AppointmentSlot_bookedCount_valid"
  CHECK ("bookedCount" >= 0 AND "bookedCount" <= "capacity"),
  ADD CONSTRAINT "AppointmentSlot_time_order"
  CHECK ("startsAt" < "endsAt");
