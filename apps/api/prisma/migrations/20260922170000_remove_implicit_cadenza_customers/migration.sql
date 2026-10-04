-- Cadenza customers are explicit business actors, not application memberships.
-- The preceding customer migration temporarily created customers for every
-- Cadenza member so existing rentals could be mapped. Keep only customers
-- that are backed by an existing rental; users without a Cadenza rental must
-- explicitly register as customers through the Cadenza customer flow.
DELETE FROM "CadenzaCustomer" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "CadenzaRental" r
  WHERE r."customerId" = c."id"
);
