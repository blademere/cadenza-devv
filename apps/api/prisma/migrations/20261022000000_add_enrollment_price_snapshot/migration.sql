ALTER TABLE "CadenzaEnrollment"
ADD COLUMN "priceAtEnrollment" DECIMAL(19,4);

UPDATE "CadenzaEnrollment" AS enrollment
SET "priceAtEnrollment" = package."price"
FROM "CadenzaLessonPackage" AS package
WHERE enrollment."lessonPackageId" = package."id"
  AND enrollment."priceAtEnrollment" IS NULL;

ALTER TABLE "CadenzaEnrollment"
ALTER COLUMN "priceAtEnrollment" SET NOT NULL;
