-- Script pour insérer des données de test pour l'historique des paiements
-- Ce script crée des paiements pour les mois précédents afin de tester l'historique

-- Paiement pour novembre 2025
INSERT INTO profit_payments (
  period_start,
  period_end,
  total_profit,
  imad_share,
  jassem_share,
  imad_paid,
  jassem_paid,
  status,
  created_at
) VALUES (
  '2025-11-01',
  '2025-11-30',
  2500.00,
  1250.00,
  1250.00,
  true,
  true,
  'pending',
  '2025-11-30 23:00:00'
) ON CONFLICT DO NOTHING;

-- Paiement pour octobre 2025
INSERT INTO profit_payments (
  period_start,
  period_end,
  total_profit,
  imad_share,
  jassem_share,
  imad_paid,
  jassem_paid,
  status,
  created_at
) VALUES (
  '2025-10-01',
  '2025-10-31',
  3200.50,
  1600.25,
  1600.25,
  true,
  false,
  'sent',
  '2025-10-31 23:00:00'
) ON CONFLICT DO NOTHING;

-- Paiement pour septembre 2025
INSERT INTO profit_payments (
  period_start,
  period_end,
  total_profit,
  imad_share,
  jassem_share,
  imad_paid,
  jassem_paid,
  status,
  created_at
) VALUES (
  '2025-09-01',
  '2025-09-30',
  1800.75,
  900.375,
  900.375,
  false,
  false,
  'pending',
  '2025-09-30 23:00:00'
) ON CONFLICT DO NOTHING;

-- Paiement pour août 2025
INSERT INTO profit_payments (
  period_start,
  period_end,
  total_profit,
  imad_share,
  jassem_share,
  imad_paid,
  jassem_paid,
  status,
  created_at
) VALUES (
  '2025-08-01',
  '2025-08-31',
  4100.00,
  2050.00,
  2050.00,
  true,
  true,
  'sent',
  '2025-08-31 23:00:00'
) ON CONFLICT DO NOTHING;

-- Paiement pour juillet 2025
INSERT INTO profit_payments (
  period_start,
  period_end,
  total_profit,
  imad_share,
  jassem_share,
  imad_paid,
  jassem_paid,
  status,
  notes,
  created_at
) VALUES (
  '2025-07-01',
  '2025-07-31',
  2900.25,
  1450.125,
  1450.125,
  true,
  true,
  'pending',
  'Paiement avec notes de test',
  '2025-07-31 23:00:00'
) ON CONFLICT DO NOTHING;

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DONNÉES DE TEST INSÉRÉES AVEC SUCCÈS!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '5 paiements de test ont été créés pour:';
  RAISE NOTICE '- Novembre 2025 (payé, status: pending)';
  RAISE NOTICE '- Octobre 2025 (partiellement payé, status: sent)';
  RAISE NOTICE '- Septembre 2025 (non payé, status: pending)';
  RAISE NOTICE '- Août 2025 (payé, status: sent)';
  RAISE NOTICE '- Juillet 2025 (payé avec notes, status: pending)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Vous pouvez maintenant tester l''historique!';
  RAISE NOTICE '========================================';
END $$;






