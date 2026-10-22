ALTER TABLE "CadenzaRoomBooking"
ADD COLUMN "rateAtBooking" DECIMAL(19,4),
ADD COLUMN "durationHoursAtBooking" INTEGER,
ADD COLUMN "roomNameAtBooking" TEXT;

UPDATE "CadenzaRoomBooking" AS booking
SET
  "rateAtBooking" = room."rentalRate",
  "durationHoursAtBooking" = room."rentalDurationHours",
  "roomNameAtBooking" = room."roomType"
FROM "CadenzaRoom" AS room
WHERE booking."roomId" = room."id";
