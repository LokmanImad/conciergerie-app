-- Script pour lier les charges de ménage aux réservations
-- Permet de déduire les frais de ménage du calcul de commission

-- Ajouter la colonne reservation_id à la table charges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE charges ADD COLUMN reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonne reservation_id ajoutée à la table charges';
  ELSE
    RAISE NOTICE 'La colonne reservation_id existe déjà dans charges';
  END IF;
END $$;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_charges_reservation_id ON charges(reservation_id);

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN charges.reservation_id IS 'ID de la réservation liée (optionnel). Utilisé pour les charges de ménage qui doivent être déduites du calcul de commission de la réservation.';




