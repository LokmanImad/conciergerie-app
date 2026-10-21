-- Script pour ajouter les frais de ménage aux réservations et appartements
-- Solution professionnelle : prix par défaut par appartement + possibilité de surcharge par réservation

-- 1. Ajouter le prix de ménage par défaut dans la table apartments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'default_cleaning_fee'
  ) THEN
    ALTER TABLE apartments ADD COLUMN default_cleaning_fee DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE 'Colonne default_cleaning_fee ajoutée à la table apartments';
  ELSE
    RAISE NOTICE 'La colonne default_cleaning_fee existe déjà dans apartments';
  END IF;
END $$;

-- 2. Ajouter les frais de ménage spécifiques dans la table reservations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'cleaning_fee'
  ) THEN
    ALTER TABLE reservations ADD COLUMN cleaning_fee DECIMAL(10, 2);
    RAISE NOTICE 'Colonne cleaning_fee ajoutée à la table reservations';
  ELSE
    RAISE NOTICE 'La colonne cleaning_fee existe déjà dans reservations';
  END IF;
END $$;

-- 3. Ajouter un commentaire pour documenter la logique
COMMENT ON COLUMN apartments.default_cleaning_fee IS 'Prix de ménage par défaut pour cet appartement (en DH). Utilisé si cleaning_fee n''est pas spécifié dans la réservation.';
COMMENT ON COLUMN reservations.cleaning_fee IS 'Frais de ménage spécifiques pour cette réservation (en DH). Si NULL, utilise le default_cleaning_fee de l''appartement.';




