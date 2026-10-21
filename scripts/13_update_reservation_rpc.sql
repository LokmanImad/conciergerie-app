-- Fonction RPC pour mettre à jour une réservation
-- Cette fonction contourne les problèmes CORS en utilisant une fonction SQL au lieu d'un UPDATE direct
CREATE OR REPLACE FUNCTION update_reservation(
  reservation_id UUID,
  p_apartment_id UUID,
  p_client_name TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_total_amount DECIMAL(10, 2),
  p_notes TEXT DEFAULT NULL,
  p_client_number TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'bank'
)
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET
    apartment_id = p_apartment_id,
    client_name = p_client_name,
    check_in = p_check_in,
    check_out = p_check_out,
    total_amount = p_total_amount,
    notes = p_notes,
    client_number = p_client_number,
    payment_method = p_payment_method
  WHERE id = reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION update_reservation TO anon, authenticated;

