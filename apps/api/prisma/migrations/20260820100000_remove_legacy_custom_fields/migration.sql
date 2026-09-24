-- Dynamic fields are now represented by FormField/FormOption.
-- Remove the legacy standalone custom-field persistence tables.
DROP TABLE IF EXISTS "CustomFieldValue";
DROP TABLE IF EXISTS "CustomFieldDefinition";
