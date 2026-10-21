-- Ajouter les champs is_paid et is_invoiced à la table charges
-- Ces champs permettent de gérer séparément le paiement et la facturation
DO $$
BEGIN
  -- Ajouter is_paid si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'is_paid'
  ) THEN
    ALTER TABLE charges ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Ajouter is_invoiced si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'is_invoiced'
  ) THEN
    ALTER TABLE charges ADD COLUMN is_invoiced BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_charges_is_paid ON charges(is_paid);
CREATE INDEX IF NOT EXISTS idx_charges_is_invoiced ON charges(is_invoiced);






