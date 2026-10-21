-- Script pour mettre à jour les réservations existantes qui n'ont pas de payment_method
-- Les réservations sans payment_method seront mises à jour avec 'bank' par défaut

UPDATE reservations
SET payment_method = 'bank'
WHERE payment_method IS NULL;

-- Afficher le nombre de réservations mises à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Nombre de réservations mises à jour: %', updated_count;
END $$;
