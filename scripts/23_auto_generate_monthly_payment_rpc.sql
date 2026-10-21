-- Fonction RPC pour générer automatiquement le paiement du mois en cours
-- Cette fonction calcule le bénéfice du mois actuel et crée un paiement s'il n'existe pas déjà
-- Répartition 50/50 entre Imad et Jassem

-- Supprimer l'ancienne fonction si elle existe (au cas où elle avait un type de retour différent)
DROP FUNCTION IF EXISTS auto_generate_current_month_payment();

-- Créer la nouvelle fonction
CREATE OR REPLACE FUNCTION auto_generate_current_month_payment()
RETURNS void AS $$
DECLARE
  v_current_month_start DATE;
  v_current_month_end DATE;
  v_existing_payment UUID;
  v_total_commission DECIMAL(10, 2) := 0;
  v_total_charges DECIMAL(10, 2) := 0;
  v_total_profit DECIMAL(10, 2);
  v_imad_share DECIMAL(10, 2);
  v_jassem_share DECIMAL(10, 2);
  v_reservation RECORD;
  v_charge RECORD;
BEGIN
  -- Calculer le début et la fin du mois actuel
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_current_month_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Vérifier si un paiement existe déjà pour ce mois
  SELECT id INTO v_existing_payment
  FROM profit_payments
  WHERE period_start = v_current_month_start
    AND period_end = v_current_month_end;

  -- Si un paiement existe déjà, le mettre à jour avec les nouvelles valeurs
  -- Sinon, on continuera pour créer un nouveau paiement

  -- Calculer les commissions des réservations du mois
  -- Déduire UNIQUEMENT les frais de ménage liés à chaque réservation (charges avec reservation_id et service_type = "ménage")
  FOR v_reservation IN
    SELECT 
      r.id,
      r.total_amount,
      COALESCE(a.commission_rate, 25) as commission_rate,
      -- Calculer la somme UNIQUEMENT des frais de ménage liés à cette réservation
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
    WHERE r.check_in >= v_current_month_start
      AND r.check_in <= v_current_month_end
      -- Exclure les réservations déjà payées dans d'autres périodes
      AND NOT EXISTS (
        SELECT 1
        FROM profit_payments pp
        WHERE r.check_in >= pp.period_start
          AND r.check_in <= pp.period_end
          AND pp.id IS DISTINCT FROM v_existing_payment
      )
  LOOP
    -- Calculer le montant après déduction des frais de ménage
    -- Puis calculer la commission sur ce montant (toujours utiliser le commission_rate de l'appartement)
    v_total_commission := v_total_commission + (
      (COALESCE(v_reservation.total_amount, 0) - COALESCE(v_reservation.cleaning_fees, 0)) 
      * COALESCE(v_reservation.commission_rate, 25) / 100
    );
  END LOOP;

  -- Calculer les charges de la société du mois
  FOR v_charge IN
    SELECT c.amount
    FROM charges c
    LEFT JOIN service_types st ON c.service_type_id = st.id
    WHERE c.date >= v_current_month_start
      AND c.date <= v_current_month_end
      AND (st.paid_by = 'company' OR st.paid_by = 'Société' OR c.apartment_id IS NULL)
  LOOP
    v_total_charges := v_total_charges + COALESCE(v_charge.amount, 0);
  END LOOP;

  -- Calculer le bénéfice total (50/50)
  -- S'assurer que les valeurs ne sont pas NULL
  v_total_commission := COALESCE(v_total_commission, 0);
  v_total_charges := COALESCE(v_total_charges, 0);
  v_total_profit := v_total_commission - v_total_charges;
  v_imad_share := v_total_profit / 2;
  v_jassem_share := v_total_profit / 2;

  -- Si un paiement existe déjà, le mettre à jour
  IF v_existing_payment IS NOT NULL THEN
    UPDATE profit_payments
    SET
      total_profit = v_total_profit,
      imad_share = v_imad_share,
      jassem_share = v_jassem_share,
      updated_at = NOW()
    WHERE id = v_existing_payment;
  ELSE
    -- Créer le paiement même si le bénéfice est 0
    INSERT INTO profit_payments (
      period_start,
      period_end,
      total_profit,
      imad_share,
      jassem_share,
      status,
      imad_paid,
      jassem_paid
    )
    VALUES (
      v_current_month_start,
      v_current_month_end,
      v_total_profit,
      v_imad_share,
      v_jassem_share,
      'pending',
      FALSE,
      FALSE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION auto_generate_current_month_payment TO anon, authenticated;

-- Fonction trigger pour recalculer automatiquement le paiement du mois actuel
-- Cette fonction sera appelée par les triggers après INSERT, UPDATE ou DELETE
CREATE OR REPLACE FUNCTION trigger_recalculate_current_month_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_should_recalculate BOOLEAN := FALSE;
  v_current_month_start DATE;
BEGIN
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Vérifier si le changement concerne le mois actuel
  IF TG_TABLE_NAME = 'reservations' THEN
    IF TG_OP = 'INSERT' THEN
      v_should_recalculate := NEW.check_in >= v_current_month_start;
    ELSIF TG_OP = 'UPDATE' THEN
      v_should_recalculate := NEW.check_in >= v_current_month_start OR OLD.check_in >= v_current_month_start;
    ELSIF TG_OP = 'DELETE' THEN
      v_should_recalculate := OLD.check_in >= v_current_month_start;
    END IF;
  ELSIF TG_TABLE_NAME = 'charges' THEN
    IF TG_OP = 'INSERT' THEN
      -- Recalculer si la charge est du mois actuel OU si elle est liée à une réservation du mois actuel
      v_should_recalculate := NEW.date >= v_current_month_start;
      IF NOT v_should_recalculate AND NEW.reservation_id IS NOT NULL THEN
        -- Vérifier si la réservation liée est du mois actuel
        SELECT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.id = NEW.reservation_id
            AND r.check_in >= v_current_month_start
        ) INTO v_should_recalculate;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Recalculer si la date change OU si reservation_id change
      v_should_recalculate := NEW.date >= v_current_month_start OR OLD.date >= v_current_month_start;
      
      -- Si reservation_id change, vérifier si l'ancienne ou la nouvelle réservation est du mois actuel
      IF NOT v_should_recalculate AND (OLD.reservation_id IS DISTINCT FROM NEW.reservation_id) THEN
        -- Vérifier l'ancienne réservation
        IF OLD.reservation_id IS NOT NULL THEN
          SELECT EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = OLD.reservation_id
              AND r.check_in >= v_current_month_start
          ) INTO v_should_recalculate;
        END IF;
        -- Vérifier la nouvelle réservation si l'ancienne n'était pas du mois actuel
        IF NOT v_should_recalculate AND NEW.reservation_id IS NOT NULL THEN
          SELECT EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = NEW.reservation_id
              AND r.check_in >= v_current_month_start
          ) INTO v_should_recalculate;
        END IF;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      -- Recalculer si la charge était du mois actuel OU si elle était liée à une réservation du mois actuel
      v_should_recalculate := OLD.date >= v_current_month_start;
      IF NOT v_should_recalculate AND OLD.reservation_id IS NOT NULL THEN
        -- Vérifier si la réservation liée est du mois actuel
        SELECT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.id = OLD.reservation_id
            AND r.check_in >= v_current_month_start
        ) INTO v_should_recalculate;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'apartments' THEN
    -- Pour les appartements, recalculer si le taux de commission a changé
    v_should_recalculate := TRUE;
  END IF;
  
  -- Recalculer seulement si nécessaire
  IF v_should_recalculate THEN
    PERFORM auto_generate_current_month_payment();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers pour recalculer automatiquement le paiement
-- Trigger sur les réservations (INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS recalculate_payment_on_reservation_change ON reservations;
CREATE TRIGGER recalculate_payment_on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_current_month_payment();

-- Trigger sur les charges (INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS recalculate_payment_on_charge_change ON charges;
CREATE TRIGGER recalculate_payment_on_charge_change
  AFTER INSERT OR UPDATE OR DELETE ON charges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_current_month_payment();

-- Trigger sur les appartements (si le taux de commission change, cela affecte les paiements)
DROP TRIGGER IF EXISTS recalculate_payment_on_apartment_change ON apartments;
CREATE TRIGGER recalculate_payment_on_apartment_change
  AFTER UPDATE OF commission_rate ON apartments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_current_month_payment();

