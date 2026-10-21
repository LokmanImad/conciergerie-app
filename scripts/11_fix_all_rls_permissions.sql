-- ============================================
-- SCRIPT COMPLET POUR CORRIGER TOUTES LES PERMISSIONS RLS
-- ============================================
-- Ce script configure les permissions RLS pour toutes les tables
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- PARTIE 1: Désactiver RLS ou créer des politiques permissives
-- ============================================

-- Option 1: DÉSACTIVER RLS (plus simple, pour le développement)
-- Décommentez ces lignes si vous voulez désactiver RLS complètement:
/*
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE charges DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_reimbursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE profit_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings DISABLE ROW LEVEL SECURITY;
*/

-- Option 2: ACTIVER RLS ET CRÉER DES POLITIQUES PERMISSIVES (recommandé pour la production)
-- Activer RLS sur toutes les tables
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques existantes
DO $$
DECLARE
  r RECORD;
  tables TEXT[] := ARRAY['apartments', 'service_types', 'charges', 'reservations', 'wallets', 'wallet_reimbursements', 'profit_payments', 'payment_settings'];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    FOR r IN 
      SELECT policyname FROM pg_policies 
      WHERE tablename = table_name AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, table_name);
      RAISE NOTICE 'Politique supprimée: % sur %', r.policyname, table_name;
    END LOOP;
  END LOOP;
END $$;

-- Créer des politiques permissives pour TOUTES les tables
-- Ces politiques permettent toutes les opérations (SELECT, INSERT, UPDATE, DELETE)

CREATE POLICY "Allow all operations on apartments" ON apartments 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on service_types" ON service_types 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on charges" ON charges 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on reservations" ON reservations 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on wallets" ON wallets 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on wallet_reimbursements" ON wallet_reimbursements 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on profit_payments" ON profit_payments 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on payment_settings" ON payment_settings 
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PARTIE 2: Vérification
-- ============================================

-- Vérifier l'état RLS de toutes les tables
SELECT 
  tablename,
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = tablename AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) 
    THEN 'RLS activé'
    ELSE 'RLS désactivé'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('apartments', 'service_types', 'charges', 'reservations', 'wallets', 'wallet_reimbursements', 'profit_payments', 'payment_settings')
ORDER BY tablename;

-- Vérifier que les politiques ont été créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('apartments', 'service_types', 'charges', 'reservations', 'wallets', 'wallet_reimbursements', 'profit_payments', 'payment_settings')
ORDER BY tablename, policyname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOUTES LES PERMISSIONS RLS ONT ÉTÉ CONFIGURÉES!';
  RAISE NOTICE 'Toutes les opérations sont maintenant autorisées.';
  RAISE NOTICE 'Vous pouvez maintenant modifier les réservations et charges.';
  RAISE NOTICE '========================================';
END $$;






