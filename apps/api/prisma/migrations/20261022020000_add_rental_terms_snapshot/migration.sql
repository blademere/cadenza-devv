ALTER TABLE "CadenzaRental"
ADD COLUMN "rentalPackageNameAtRental" TEXT,
ADD COLUMN "rentalRateAtRental" DECIMAL(19,4),
ADD COLUMN "rentalHoursAtRental" INTEGER,
ADD COLUMN "depositAtRental" DECIMAL(19,4);

UPDATE "CadenzaRental" AS rental
SET
  "rentalPackageNameAtRental" = package."name",
  "rentalRateAtRental" = package."rentalRate",
  "rentalHoursAtRental" = package."rentalHours",
  "depositAtRental" = package."depositAmount"
FROM "CadenzaRentalPackage" AS package
WHERE rental."rentalPackageId" = package."id";

UPDATE "CadenzaRental"
SET "rentalRateAtRental" = "totalAmount",
    "rentalHoursAtRental" = 8,
    "depositAtRental" = "refundableDeposit"
WHERE "rentalRateAtRental" IS NULL;
