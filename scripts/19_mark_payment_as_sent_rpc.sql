-- Fonction RPC pour marquer un paiement comme envoyé/reçu
-- Cette fonction contourne les problèmes CORS

CREATE OR REPLACE FUNCTION mark_payment_as_sent(payment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profit_payments
  SET status = 'sent'
  WHERE id = payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION mark_payment_as_sent TO anon, authenticated;






