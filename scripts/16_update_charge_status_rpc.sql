-- Fonctions RPC pour mettre à jour le statut des charges (payer/facturer)
-- Ces fonctions contournent les problèmes CORS

-- Fonction pour marquer une charge comme payée
CREATE OR REPLACE FUNCTION mark_charge_as_paid(charge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE charges
  SET is_paid = TRUE
  WHERE id = charge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer une charge comme facturée
CREATE OR REPLACE FUNCTION mark_charge_as_invoiced(charge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE charges
  SET is_invoiced = TRUE
  WHERE id = charge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION mark_charge_as_paid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_charge_as_invoiced TO anon, authenticated;






