-- Fonction RPC pour mettre à jour une charge
-- Cette fonction contourne les problèmes CORS en utilisant une fonction SQL au lieu d'un UPDATE direct

-- Supprimer toutes les anciennes versions de la fonction update_charge
DROP FUNCTION IF EXISTS update_charge(UUID, UUID, UUID, DECIMAL, DATE, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_charge(UUID, UUID, UUID, DECIMAL, DATE, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS update_charge(UUID, UUID, UUID, DECIMAL, DATE, TEXT, TEXT, TEXT, UUID, TEXT);

-- Créer la nouvelle fonction avec le paramètre reservation_id et payment_method
CREATE OR REPLACE FUNCTION update_charge(
  charge_id UUID,
  p_apartment_id UUID,
  p_service_type_id UUID,
  p_amount DECIMAL(10, 2),
  p_date DATE,
  p_description TEXT DEFAULT NULL,
  p_paid_by_person TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_reservation_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'bank'
)
RETURNS void AS $$
BEGIN
  UPDATE charges
  SET
    apartment_id = p_apartment_id,
    service_type_id = p_service_type_id,
    amount = p_amount,
    date = p_date,
    description = p_description,
    paid_by_person = p_paid_by_person,
    notes = p_notes,
    reservation_id = p_reservation_id,
    payment_method = p_payment_method
  WHERE id = charge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION update_charge TO anon, authenticated;



