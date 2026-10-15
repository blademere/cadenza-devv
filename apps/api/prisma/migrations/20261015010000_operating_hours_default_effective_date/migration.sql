ALTER TABLE "CadenzaOperatingHours"
  ADD COLUMN "previousWeeklyHours" JSONB,
  ADD COLUMN "defaultEffectiveFrom" TIMESTAMP(3);
