-- Fonction pour incrémenter le solde du portefeuille
CREATE OR REPLACE FUNCTION increment_wallet(person TEXT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets
  SET balance = balance + amount
  WHERE person_name = person;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour décrémenter le solde du portefeuille
CREATE OR REPLACE FUNCTION decrement_wallet(person TEXT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets
  SET balance = balance - amount
  WHERE person_name = person;
END;
$$ LANGUAGE plpgsql;
