-- Fonction RPC pour mettre à jour le statut des réservations (facturer)
-- Cette fonction contourne les problèmes CORS

CREATE OR REPLACE FUNCTION mark_reservation_as_invoiced(reservation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'invoiced'
  WHERE id = reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION mark_reservation_as_invoiced TO anon, authenticated;






