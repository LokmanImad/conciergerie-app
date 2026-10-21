-- Ajouter le champ status à la table charges
-- Statuts possibles: 'pending' (en attente), 'paid' (payé), 'invoiced' (facturé)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'status'
  ) THEN
    ALTER TABLE charges ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Ajouter la contrainte si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'charges_status_check'
  ) THEN
    ALTER TABLE charges ADD CONSTRAINT charges_status_check 
      CHECK (status IN ('pending', 'paid', 'invoiced'));
  END IF;
END $$;

-- Ajouter le champ status à la table reservations
-- Statuts possibles: 'pending' (en attente), 'invoiced' (facturé)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'status'
  ) THEN
    ALTER TABLE reservations ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Ajouter la contrainte si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_status_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
      CHECK (status IN ('pending', 'invoiced'));
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

