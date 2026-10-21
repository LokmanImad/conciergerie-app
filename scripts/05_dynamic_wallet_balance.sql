-- Fonction pour calculer le solde du portefeuille dynamiquement
-- Le solde = total des charges payées par la personne - total des remboursements
CREATE OR REPLACE FUNCTION get_wallet_balance(person TEXT)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total_charges DECIMAL(10, 2) := 0;
  total_reimbursements DECIMAL(10, 2) := 0;
BEGIN
  -- Calculer le total des charges payées par la personne
  SELECT COALESCE(SUM(amount), 0) INTO total_charges
  FROM charges
  WHERE paid_by_person = person;
  
  -- Calculer le total des remboursements
  SELECT COALESCE(SUM(amount), 0) INTO total_reimbursements
  FROM wallet_reimbursements
  WHERE person_name = person;
  
  -- Retourner le solde (charges - remboursements)
  RETURN total_charges - total_reimbursements;
END;
$$ LANGUAGE plpgsql;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_charges_paid_by_person ON charges(paid_by_person) WHERE paid_by_person IN ('imad', 'jassem');






