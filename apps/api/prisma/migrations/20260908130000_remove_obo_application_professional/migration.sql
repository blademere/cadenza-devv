-- Preserve the legacy application-level professional before removing the relationship.
-- The new architecture stores professional selections in formValues and submitted
-- historical data in professionalSnapshots. Existing rows may not have a form field
-- that can be mapped safely, so retain the legacy selection under a reserved snapshot key.
UPDATE "OboPermitApplication" AS a
SET "professionalSnapshots" = COALESCE(a."professionalSnapshots", '{}'::jsonb)
  || jsonb_build_object(
    '_legacyProfessional',
    jsonb_build_object(
      'professionalId', p."id",
      'name', concat_ws(' ', p_person."firstName", p_person."middleName", p_person."lastName", p_person."suffix"),
      'registrationNumber', p."registrationNumber",
      'prcId', p."prcId",
      'ptrNumber', p."ptrNumber",
      'role', p."professionalRole"
    )
  )
FROM "OboProfessional" AS p
JOIN "Person" AS p_person ON p_person."id" = p."personId"
WHERE a."professionalId" = p."id";

-- Remove the legacy lookup index before dropping the column.
DROP INDEX IF EXISTS "OboPermitApplication_professionalId_createdAt_idx";

-- Remove the legacy foreign-key relationship.
ALTER TABLE "OboPermitApplication"
DROP CONSTRAINT IF EXISTS "OboPermitApplication_professionalId_fkey";

-- The application-professional relationship is intentionally not replaced by a
-- join table or another foreign key. Professional selection now belongs to formValues.
ALTER TABLE "OboPermitApplication"
DROP COLUMN IF EXISTS "professionalId";
