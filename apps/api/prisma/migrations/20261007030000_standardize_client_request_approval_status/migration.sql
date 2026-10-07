UPDATE "CadenzaEnrollment"
SET "status" = 'FOR_APPROVAL'
WHERE "status" IN ('PENDING', 'PENDING_PAYMENT');

UPDATE "CadenzaRoomBooking"
SET "status" = 'FOR_APPROVAL'
WHERE "status" IN ('PENDING', 'PAID', 'PARTIALLY_PAID');

UPDATE "CadenzaRental"
SET "status" = 'FOR_APPROVAL'
WHERE "status" IN ('PENDING', 'PAID', 'PARTIALLY_PAID');

ALTER TABLE "CadenzaEnrollment"
ALTER COLUMN "status" SET DEFAULT 'FOR_APPROVAL';

ALTER TABLE "CadenzaRoomBooking"
ALTER COLUMN "status" SET DEFAULT 'FOR_APPROVAL';

ALTER TABLE "CadenzaRental"
ALTER COLUMN "status" SET DEFAULT 'FOR_APPROVAL';
