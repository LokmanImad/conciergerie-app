-- Ajouter le champ status à la table profit_payments
-- Statuts possibles: 'pending' (en cours), 'sent' (envoyé/reçu)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profit_payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE profit_payments ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Ajouter la contrainte si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profit_payments_status_check'
  ) THEN
    ALTER TABLE profit_payments ADD CONSTRAINT profit_payments_status_check 
      CHECK (status IN ('pending', 'sent'));
  END IF;
END $$;

-- Mettre à jour les anciens paiements pour qu'ils aient le statut 'pending' par défaut
UPDATE profit_payments SET status = 'pending' WHERE status IS NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profit_payments_status ON profit_payments(status);






