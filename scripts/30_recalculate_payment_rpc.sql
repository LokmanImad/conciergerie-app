-- Fonction RPC pour recalculer manuellement un paiement existant (ex: mois passés)
-- Utile si une réservation a été modifiée après la clôture du mois

CREATE OR REPLACE FUNCTION recalculate_payment(p_payment_id UUID)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_total_commission DECIMAL(10, 2) := 0;
  v_total_charges DECIMAL(10, 2) := 0;
  v_total_profit DECIMAL(10, 2);
  v_reservation RECORD;
  v_charge RECORD;
BEGIN
  -- Récupérer la période du paiement
  SELECT period_start, period_end INTO v_period_start, v_period_end
  FROM profit_payments WHERE id = p_payment_id;

  IF v_period_start IS NULL THEN
    RAISE EXCEPTION 'Paiement introuvable : %', p_payment_id;
  END IF;

  -- Recalculer les commissions des réservations de la période
  FOR v_reservation IN
    SELECT
      r.total_amount,
      COALESCE(a.commission_rate, 25) as commission_rate,
      COALESCE((
        SELECT SUM(c.amount)
        FROM charges c
        INNER JOIN service_types st ON c.service_type_id = st.id
        WHERE c.reservation_id = r.id
          AND (
            LOWER(st.name) LIKE '%ménage%'
            OR LOWER(st.name) LIKE '%menage%'
            OR LOWER(st.name) LIKE '%cleaning%'
            OR LOWER(st.name) LIKE '%nettoyage%'
            OR LOWER(st.name) LIKE '%frais de ménage%'
          )
      ), 0) as cleaning_fees
    FROM reservations r
    LEFT JOIN apartments a ON r.apartment_id = a.id
    WHERE r.check_in >= v_period_start
      AND r.check_in <= v_period_end
  LOOP
    v_total_commission := v_total_commission + (
      (COALESCE(v_reservation.total_amount, 0) - COALESCE(v_reservation.cleaning_fees, 0))
      * COALESCE(v_reservation.commission_rate, 25) / 100
    );
  END LOOP;

  -- Recalculer les charges de la société pour la période
  FOR v_charge IN
    SELECT c.amount
    FROM charges c
    LEFT JOIN service_types st ON c.service_type_id = st.id
    WHERE c.date >= v_period_start
      AND c.date <= v_period_end
      AND (st.paid_by = 'company' OR st.paid_by = 'Société' OR c.apartment_id IS NULL)
  LOOP
    v_total_charges := v_total_charges + COALESCE(v_charge.amount, 0);
  END LOOP;

  v_total_profit := v_total_commission - v_total_charges;

  -- Mettre à jour le paiement avec les nouvelles valeurs
  UPDATE profit_payments
  SET
    total_profit = v_total_profit,
    imad_share = v_total_profit / 2,
    jassem_share = v_total_profit / 2,
    updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION recalculate_payment TO anon, authenticated;
