-- AlterTable
ALTER TABLE "CadenzaInstrument" ADD COLUMN     "rentalDuration" INTEGER,
ALTER COLUMN "rentalRate" DROP NOT NULL;
