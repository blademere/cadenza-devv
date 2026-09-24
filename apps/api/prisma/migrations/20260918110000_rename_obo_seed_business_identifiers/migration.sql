-- Rename OBO seed business identifiers after the application terminology cleanup.
-- Fail closed if both legacy and target keys exist.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Form" WHERE "key" = 'obo-building-plan-permit')
     AND EXISTS (SELECT 1 FROM "Form" WHERE "key" = 'obo-building-permit') THEN
    RAISE EXCEPTION 'Cannot rename OBO application form: both legacy and target keys exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Form" WHERE "key" = 'obo-building-plan-permit') THEN
    UPDATE "Form"
    SET "key" = 'obo-building-permit',
        "name" = 'Building Permit Application',
        "description" = 'Dynamic application form for OBO building permit applications.'
    WHERE "key" = 'obo-building-plan-permit';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OboPermitType" WHERE "key" = 'building-plan-permit')
     AND EXISTS (SELECT 1 FROM "OboPermitType" WHERE "key" = 'building-permit') THEN
    RAISE EXCEPTION 'Cannot rename OBO permit type: both legacy and target keys exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "OboPermitType" WHERE "key" = 'building-plan-permit') THEN
    UPDATE "OboPermitType"
    SET "key" = 'building-permit',
        "name" = 'Building Permit',
        "description" = 'Building permit application for building construction and related work.'
    WHERE "key" = 'building-plan-permit';
  END IF;
END $$;
