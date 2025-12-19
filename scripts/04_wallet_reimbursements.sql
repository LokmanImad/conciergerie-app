-- Table pour stocker l'historique des remboursements de dépenses personnelles
CREATE TABLE IF NOT EXISTS wallet_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL CHECK (person_name IN ('imad', 'jassem')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_wallet_reimbursements_person ON wallet_reimbursements(person_name);
CREATE INDEX IF NOT EXISTS idx_wallet_reimbursements_date ON wallet_reimbursements(payment_date DESC);

-- Activer RLS
ALTER TABLE wallet_reimbursements ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on wallet_reimbursements" ON wallet_reimbursements FOR ALL USING (true) WITH CHECK (true);

-- Fonction pour enregistrer un remboursement et diminuer le solde du portefeuille
CREATE OR REPLACE FUNCTION record_wallet_reimbursement(
  person TEXT,
  payment_amount DECIMAL(10, 2),
  payment_notes TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insérer le remboursement dans l'historique
  INSERT INTO wallet_reimbursements (person_name, amount, notes)
  VALUES (person, payment_amount, payment_notes);
  
  -- Diminuer le solde du portefeuille
  UPDATE wallets
  SET balance = balance - payment_amount,
      updated_at = NOW()
  WHERE person_name = person;
END;
$$ LANGUAGE plpgsql;
